import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import {
  DateSyncSession,
  clearSavedDateCode,
  createEmptySyncState,
  generateDateCode,
  getChatNames,
  getSavedDateCode,
  normalizeDateCode,
  saveChatNames,
} from '../services/dateSync';
import type {
  DateChatMessage,
  DateConnectionStatus,
  DateSyncMedia,
  DateSyncState,
  DateSyncStatus,
} from '../types/dateSync';

interface DateSyncContextValue {
  supported: boolean;
  code: string | null;
  status: DateConnectionStatus;
  statusDetail: string;
  partnerConnected: boolean;
  syncState: DateSyncState;
  remoteRevision: number;
  chatMessages: DateChatMessage[];
  myName: string;
  theirName: string;
  setDisplayNames: (names: { myName: string; theirName: string }) => Promise<void>;
  createAndJoin: () => Promise<string>;
  joinWithCode: (code: string) => Promise<void>;
  leave: () => Promise<void>;
  broadcastPlayback: (input: {
    media: DateSyncMedia;
    status: DateSyncStatus;
    progress: number;
  }) => void;
  sendChat: (text: string) => void;
  shouldIgnoreLocalBroadcast: () => boolean;
}

const DateSyncContext = createContext<DateSyncContextValue | null>(null);

const DRIFT_SECONDS = 2.5;
const MAX_CHAT = 200;

export function DateSyncProvider({ children }: { children: ReactNode }) {
  const supported = Platform.OS === 'web';
  const sessionRef = useRef<DateSyncSession | null>(null);
  const seqRef = useRef(0);
  const applyRemoteUntilRef = useRef(0);
  const lastRemoteSeqRef = useRef(-1);

  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<DateConnectionStatus>('idle');
  const [statusDetail, setStatusDetail] = useState('');
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [syncState, setSyncState] = useState<DateSyncState>(createEmptySyncState);
  const [remoteRevision, setRemoteRevision] = useState(0);
  const [chatMessages, setChatMessages] = useState<DateChatMessage[]>([]);
  const [myName, setMyName] = useState('You');
  const [theirName, setTheirName] = useState('Them');

  const teardown = useCallback(() => {
    sessionRef.current?.disconnect();
    sessionRef.current = null;
  }, []);

  useEffect(() => {
    getChatNames().then((names) => {
      setMyName(names.myName);
      setTheirName(names.theirName);
    });
  }, []);

  const setDisplayNames = useCallback(
    async (names: { myName: string; theirName: string }) => {
      const nextMine = names.myName.trim().slice(0, 24) || 'You';
      const nextTheirs = names.theirName.trim().slice(0, 24) || 'Them';
      setMyName(nextMine);
      setTheirName(nextTheirs);
      await saveChatNames({ myName: nextMine, theirName: nextTheirs });
    },
    []
  );

  const startSession = useCallback(
    async (nextCode: string) => {
      teardown();
      const normalized = normalizeDateCode(nextCode);
      setCode(normalized);
      setPartnerConnected(false);
      setSyncState(createEmptySyncState());
      setChatMessages([]);
      seqRef.current = 0;
      lastRemoteSeqRef.current = -1;

      const session = new DateSyncSession({
        onStatus: (next, detail) => {
          setStatus(next);
          setStatusDetail(detail ?? '');
        },
        onPartner: setPartnerConnected,
        onRemoteState: (state) => {
          if (state.seq <= lastRemoteSeqRef.current) return;
          lastRemoteSeqRef.current = state.seq;
          applyRemoteUntilRef.current = Date.now() + 2500;
          setSyncState(state);
          setRemoteRevision((n) => n + 1);
        },
        onChat: (message) => {
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            const next = [
              ...prev,
              {
                ...message,
                mine: false,
              },
            ];
            return next.length > MAX_CHAT ? next.slice(-MAX_CHAT) : next;
          });
        },
      });
      sessionRef.current = session;
      await session.connect(normalized);
    },
    [teardown]
  );

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    getSavedDateCode().then((saved) => {
      if (cancelled || !saved) return;
      void startSession(saved);
    });
    return () => {
      cancelled = true;
      teardown();
    };
  }, [supported, startSession, teardown]);

  const createAndJoin = useCallback(async () => {
    const next = generateDateCode();
    await startSession(next);
    return next;
  }, [startSession]);

  const joinWithCode = useCallback(
    async (raw: string) => {
      await startSession(raw);
    },
    [startSession]
  );

  const leave = useCallback(async () => {
    teardown();
    await clearSavedDateCode();
    setCode(null);
    setStatus('idle');
    setStatusDetail('');
    setPartnerConnected(false);
    setSyncState(createEmptySyncState());
    setChatMessages([]);
  }, [teardown]);

  const shouldIgnoreLocalBroadcast = useCallback(
    () => Date.now() < applyRemoteUntilRef.current,
    []
  );

  const broadcastPlayback = useCallback(
    (input: {
      media: DateSyncMedia;
      status: DateSyncStatus;
      progress: number;
    }) => {
      if (!partnerConnected || !sessionRef.current) return;
      if (shouldIgnoreLocalBroadcast()) return;

      seqRef.current += 1;
      const next: DateSyncState = {
        media: input.media,
        status: input.status,
        progress: Math.max(0, input.progress),
        updatedAt: Date.now(),
        seq: seqRef.current,
      };
      setSyncState(next);
      sessionRef.current.sendState(next);
    },
    [partnerConnected, shouldIgnoreLocalBroadcast]
  );

  const sendChat = useCallback(
    (text: string) => {
      if (!partnerConnected || !sessionRef.current) return;
      const sent = sessionRef.current.sendChat(text);
      if (!sent) return;
      const clientId = sessionRef.current.getClientId();
      setChatMessages((prev) => {
        const next = [
          ...prev,
          {
            id: sent.id,
            clientId,
            text: text.trim().slice(0, 500),
            createdAt: sent.createdAt,
            mine: true,
          },
        ];
        return next.length > MAX_CHAT ? next.slice(-MAX_CHAT) : next;
      });
    },
    [partnerConnected]
  );

  const value = useMemo<DateSyncContextValue>(
    () => ({
      supported,
      code,
      status,
      statusDetail,
      partnerConnected,
      syncState,
      remoteRevision,
      chatMessages,
      myName,
      theirName,
      setDisplayNames,
      createAndJoin,
      joinWithCode,
      leave,
      broadcastPlayback,
      sendChat,
      shouldIgnoreLocalBroadcast,
    }),
    [
      supported,
      code,
      status,
      statusDetail,
      partnerConnected,
      syncState,
      remoteRevision,
      chatMessages,
      myName,
      theirName,
      setDisplayNames,
      createAndJoin,
      joinWithCode,
      leave,
      broadcastPlayback,
      sendChat,
      shouldIgnoreLocalBroadcast,
    ]
  );

  return (
    <DateSyncContext.Provider value={value}>{children}</DateSyncContext.Provider>
  );
}

export function useDateSync() {
  const ctx = useContext(DateSyncContext);
  if (!ctx) {
    throw new Error('useDateSync must be used within DateSyncProvider');
  }
  return ctx;
}

export function shouldApplyRemoteSeek(
  localProgress: number,
  remoteProgress: number,
  remoteStatus: DateSyncStatus
): boolean {
  if (remoteStatus === 'paused') return true;
  return Math.abs(localProgress - remoteProgress) > DRIFT_SECONDS;
}
