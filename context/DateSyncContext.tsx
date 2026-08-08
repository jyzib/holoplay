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
  getSavedDateCode,
  normalizeDateCode,
} from '../services/dateSync';
import type {
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
  createAndJoin: () => Promise<string>;
  joinWithCode: (code: string) => Promise<void>;
  leave: () => Promise<void>;
  broadcastPlayback: (input: {
    media: DateSyncMedia;
    status: DateSyncStatus;
    progress: number;
  }) => void;
  shouldIgnoreLocalBroadcast: () => boolean;
}

const DateSyncContext = createContext<DateSyncContextValue | null>(null);

const DRIFT_SECONDS = 2.5;

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

  const teardown = useCallback(() => {
    sessionRef.current?.disconnect();
    sessionRef.current = null;
  }, []);

  const startSession = useCallback(
    async (nextCode: string) => {
      teardown();
      const normalized = normalizeDateCode(nextCode);
      setCode(normalized);
      setPartnerConnected(false);
      setSyncState(createEmptySyncState());
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
          applyRemoteUntilRef.current = Date.now() + 1500;
          setSyncState(state);
          setRemoteRevision((n) => n + 1);
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

  const value = useMemo<DateSyncContextValue>(
    () => ({
      supported,
      code,
      status,
      statusDetail,
      partnerConnected,
      syncState,
      remoteRevision,
      createAndJoin,
      joinWithCode,
      leave,
      broadcastPlayback,
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
      createAndJoin,
      joinWithCode,
      leave,
      broadcastPlayback,
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
