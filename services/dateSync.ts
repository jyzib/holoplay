import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  DateConnectionStatus,
  DateSyncMessage,
  DateSyncState,
} from '../types/dateSync';

const CODE_KEY = '@holoplay_date_code';
const CLIENT_KEY = '@holoplay_date_client_id';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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
  private destroyed = false;
  private isHost = false;
  private handlers: DateSyncHandlers;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(handlers: DateSyncHandlers) {
    this.handlers = handlers;
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
      this.send({ kind: 'hello', clientId: this.clientId });
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
    if (msg.kind === 'hello' || msg.kind === 'ping') {
      this.handlers.onPartner(true);
      this.handlers.onStatus('paired', 'Paired — play something together');
      return;
    }
    if (msg.kind === 'state' && msg.clientId !== this.clientId) {
      this.handlers.onRemoteState(msg.state, msg.clientId);
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
