import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  DateConnectionStatus,
  DateSyncMessage,
  DateSyncState,
} from '../types/dateSync';

const CODE_KEY = '@holoplay_date_code';
const CLIENT_KEY = '@holoplay_date_client_id';
const MY_NAME_KEY = '@holoplay_date_my_name';
const THEIR_NAME_KEY = '@holoplay_date_their_name';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export async function getChatNames(): Promise<{ myName: string; theirName: string }> {
  const [myName, theirName] = await Promise.all([
    AsyncStorage.getItem(MY_NAME_KEY),
    AsyncStorage.getItem(THEIR_NAME_KEY),
  ]);
  return {
    myName: (myName ?? '').trim() || 'You',
    theirName: (theirName ?? '').trim() || 'Them',
  };
}

export async function saveChatNames(input: {
  myName: string;
  theirName: string;
}): Promise<void> {
  await AsyncStorage.setItem(MY_NAME_KEY, input.myName.trim().slice(0, 24));
  await AsyncStorage.setItem(THEIR_NAME_KEY, input.theirName.trim().slice(0, 24));
}

export function normalizeDateCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function generateDateCode(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export async function getSavedDateCode(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(CODE_KEY);
  return raw ? normalizeDateCode(raw) : null;
}

export async function saveDateCode(code: string): Promise<void> {
  await AsyncStorage.setItem(CODE_KEY, normalizeDateCode(code));
}

export async function clearSavedDateCode(): Promise<void> {
  await AsyncStorage.removeItem(CODE_KEY);
}

export async function getOrCreateClientId(): Promise<string> {
  const existing = await AsyncStorage.getItem(CLIENT_KEY);
  if (existing) return existing;
  const id = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await AsyncStorage.setItem(CLIENT_KEY, id);
  return id;
}

export function hostPeerIdForCode(code: string): string {
  return `holoplay-${normalizeDateCode(code).toLowerCase()}`;
}

export function createEmptySyncState(): DateSyncState {
  return {
    media: null,
    status: 'paused',
    progress: 0,
    updatedAt: Date.now(),
    seq: 0,
  };
}

export type DateSyncHandlers = {
  onStatus: (status: DateConnectionStatus, detail?: string) => void;
  onPartner: (connected: boolean) => void;
  onRemoteState: (state: DateSyncState, fromClientId: string) => void;
  onRemoteName: (name: string) => void;
  onChat: (message: {
    id: string;
    clientId: string;
    text: string;
    createdAt: number;
    name: string;
  }) => void;
  onChatAck: (id: string, status: 'delivered' | 'seen') => void;
  onTyping: (isTyping: boolean) => void;
};

type PeerLike = {
  id: string;
  destroy: () => void;
  on: (event: string, cb: (...args: any[]) => void) => void;
  connect: (id: string) => DataConnectionLike;
};

type DataConnectionLike = {
  open: boolean;
  peer: string;
  send: (data: unknown) => void;
  close: () => void;
  on: (event: string, cb: (...args: any[]) => void) => void;
};

/**
 * PeerJS-based 2-person room. Works on web (and mobile browsers).
 * One device becomes host with a deterministic peer id from the date code;
 * the other connects as guest.
 */
export class DateSyncSession {
  private peer: PeerLike | null = null;
  private conn: DataConnectionLike | null = null;
  private clientId = '';
  private code = '';
  private displayName = 'You';
  private destroyed = false;
  private isHost = false;
  private handlers: DateSyncHandlers;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(handlers: DateSyncHandlers) {
    this.handlers = handlers;
  }

  setDisplayName(name: string) {
    const next = name.trim().slice(0, 24) || 'You';
    this.displayName = next;
    if (this.conn?.open) {
      this.send({
        kind: 'profile',
        clientId: this.clientId,
        name: next,
      });
    }
  }

  async connect(code: string): Promise<void> {
    this.destroyed = false;
    this.code = normalizeDateCode(code);
    if (this.code.length < 4) {
      this.handlers.onStatus('error', 'Code must be at least 4 characters');
      return;
    }

    if (typeof window === 'undefined') {
      this.handlers.onStatus(
        'error',
        'Movie Date works in the web app (phone browser or desktop).'
      );
      return;
    }

    this.handlers.onStatus('connecting');
    this.clientId = await getOrCreateClientId();
    await saveDateCode(this.code);

    const PeerModule = require('peerjs') as { default: new (id?: string) => PeerLike };
    const Peer = PeerModule.default;
    const hostId = hostPeerIdForCode(this.code);

    // Try to become host first.
    const hostPeer = new Peer(hostId);

    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      hostPeer.on('open', () => {
        if (this.destroyed) {
          hostPeer.destroy();
          finish();
          return;
        }
        this.isHost = true;
        this.peer = hostPeer;
        this.handlers.onStatus('waiting', 'Share this code — waiting for partner…');
        hostPeer.on('connection', (connection: DataConnectionLike) => {
          this.attachConnection(connection);
        });
        finish();
      });

      hostPeer.on('error', (err: { type?: string; message?: string }) => {
        // ID taken → join as guest
        if (err?.type === 'unavailable-id' || /taken|unavailable/i.test(err?.message ?? '')) {
          try {
            hostPeer.destroy();
          } catch {
            // ignore
          }
          void this.connectAsGuest(Peer, hostId).then(finish, finish);
          return;
        }
        this.handlers.onStatus('error', err?.message ?? 'Could not start Movie Date');
        finish();
      });
    });
  }

  private async connectAsGuest(
    PeerCtor: new (id?: string) => PeerLike,
    hostId: string
  ): Promise<void> {
    if (this.destroyed) return;
    this.isHost = false;
    const guest = new PeerCtor();
    this.peer = guest;

    await new Promise<void>((resolve) => {
      guest.on('open', () => {
        if (this.destroyed) {
          guest.destroy();
          resolve();
          return;
        }
        this.handlers.onStatus('connecting', 'Connecting to partner…');
        this.tryGuestConnect(guest, hostId, 0);
        resolve();
      });

      guest.on('error', (err: { message?: string }) => {
        this.handlers.onStatus('error', err?.message ?? 'Could not join Movie Date');
        resolve();
      });
    });
  }

  private tryGuestConnect(guest: PeerLike, hostId: string, attempt: number) {
    if (this.destroyed) return;
    const connection = guest.connect(hostId);
    let opened = false;

    connection.on('open', () => {
      opened = true;
      this.attachConnection(connection);
    });

    connection.on('error', () => {
      // retry below via timeout
    });

    setTimeout(() => {
      if (this.destroyed || opened || this.conn?.open) return;
      if (attempt >= 8) {
        this.handlers.onStatus(
          'error',
          'Could not reach partner. Ask them to keep the Date tab open.'
        );
        return;
      }
      try {
        connection.close();
      } catch {
        // ignore
      }
      this.handlers.onStatus(
        'connecting',
        `Still connecting… (${attempt + 1})`
      );
      this.tryGuestConnect(guest, hostId, attempt + 1);
    }, 2000);
  }

  private attachConnection(connection: DataConnectionLike) {
    // Prefer the newest connection (only 2 people).
    if (this.conn && this.conn !== connection) {
      try {
        this.conn.close();
      } catch {
        // ignore
      }
    }
    this.conn = connection;

    const onOpen = () => {
      this.handlers.onPartner(true);
      this.handlers.onStatus('paired', 'Paired — play something together');
      this.send({
        kind: 'hello',
        clientId: this.clientId,
        name: this.displayName,
      });
      this.startPing();
    };

    if (connection.open) {
      onOpen();
    } else {
      connection.on('open', onOpen);
    }

    connection.on('data', (data: unknown) => {
      this.handleMessage(data);
    });

    connection.on('close', () => {
      if (this.conn === connection) {
        this.conn = null;
        this.handlers.onPartner(false);
        this.handlers.onStatus(
          this.isHost ? 'waiting' : 'error',
          this.isHost ? 'Partner disconnected — waiting…' : 'Disconnected from partner'
        );
      }
    });

    connection.on('error', () => {
      this.handlers.onPartner(false);
    });
  }

  private handleMessage(data: unknown) {
    const msg = data as DateSyncMessage;
    if (!msg || typeof msg !== 'object') return;
    if (msg.kind === 'ping') {
      this.handlers.onPartner(true);
      this.handlers.onStatus('paired', 'Paired — play something together');
      return;
    }
    if (msg.kind === 'hello' || msg.kind === 'profile') {
      this.handlers.onPartner(true);
      this.handlers.onStatus('paired', 'Paired — play something together');
      if (msg.clientId !== this.clientId && msg.name) {
        this.handlers.onRemoteName(msg.name);
      }
      // Reply with our profile when they say hello so both sides learn names
      if (msg.kind === 'hello' && msg.clientId !== this.clientId) {
        this.send({
          kind: 'profile',
          clientId: this.clientId,
          name: this.displayName,
        });
      }
      return;
    }
    if (msg.kind === 'state' && msg.clientId !== this.clientId) {
      this.handlers.onRemoteState(msg.state, msg.clientId);
      return;
    }
    if (msg.kind === 'chat' && msg.clientId !== this.clientId) {
      if (msg.name) this.handlers.onRemoteName(msg.name);
      this.handlers.onChat({
        id: msg.id,
        clientId: msg.clientId,
        text: msg.text,
        createdAt: msg.createdAt,
        name: msg.name || 'Them',
      });
      // Immediate delivered ack
      this.send({
        kind: 'chat_ack',
        clientId: this.clientId,
        id: msg.id,
        status: 'delivered',
      });
      return;
    }
    if (msg.kind === 'chat_ack' && msg.clientId !== this.clientId) {
      this.handlers.onChatAck(msg.id, msg.status);
      return;
    }
    if (msg.kind === 'typing' && msg.clientId !== this.clientId) {
      this.handlers.onTyping(!!msg.isTyping);
    }
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ kind: 'ping', clientId: this.clientId });
    }, 8000);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  sendState(state: DateSyncState) {
    this.send({
      kind: 'state',
      clientId: this.clientId,
      state,
    });
  }

  sendChat(text: string): { id: string; createdAt: number; name: string } | null {
    const trimmed = text.trim();
    if (!trimmed || !this.conn?.open) return null;
    const id = `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const createdAt = Date.now();
    const name = this.displayName;
    this.send({
      kind: 'chat',
      clientId: this.clientId,
      id,
      text: trimmed.slice(0, 500),
      createdAt,
      name,
    });
    return { id, createdAt, name };
  }

  sendChatAck(id: string, status: 'delivered' | 'seen') {
    this.send({
      kind: 'chat_ack',
      clientId: this.clientId,
      id,
      status,
    });
  }

  sendTyping(isTyping: boolean) {
    this.send({
      kind: 'typing',
      clientId: this.clientId,
      isTyping,
    });
  }

  private send(message: DateSyncMessage) {
    if (!this.conn?.open) return;
    try {
      this.conn.send(message);
    } catch {
      // ignore send failures
    }
  }

  getClientId() {
    return this.clientId;
  }

  disconnect() {
    this.destroyed = true;
    this.stopPing();
    try {
      this.conn?.close();
    } catch {
      // ignore
    }
    try {
      this.peer?.destroy();
    } catch {
      // ignore
    }
    this.conn = null;
    this.peer = null;
    this.handlers.onPartner(false);
    this.handlers.onStatus('idle');
  }
}
