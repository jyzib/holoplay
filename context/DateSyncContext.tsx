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
  VideoCallStatus,
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
  partnerTyping: boolean;
  myName: string;
  theirName: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callStatus: VideoCallStatus;
  setMyName: (name: string) => Promise<void>;
  createAndJoin: () => Promise<string>;
  joinWithCode: (code: string) => Promise<void>;
  leave: () => Promise<void>;
  broadcastPlayback: (input: {
    media: DateSyncMedia;
    status: DateSyncStatus;
    progress: number;
  }) => void;
  sendChat: (text: string) => void;
  markMessagesSeen: () => void;
  setTyping: (isTyping: boolean) => void;
  shouldIgnoreLocalBroadcast: () => boolean;
  startVideoCall: () => Promise<void>;
  endVideoCall: () => void;
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
  const lastSentRef = useRef<DateSyncState | null>(null);

  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<DateConnectionStatus>('idle');
  const [statusDetail, setStatusDetail] = useState('');
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [syncState, setSyncState] = useState<DateSyncState>(createEmptySyncState);
  const [remoteRevision, setRemoteRevision] = useState(0);
  const [chatMessages, setChatMessages] = useState<DateChatMessage[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [myName, setMyNameState] = useState('You');
  const [theirName, setTheirName] = useState('Them');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<VideoCallStatus>('idle');
  const myNameRef = useRef('You');
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const teardown = useCallback(() => {
    sessionRef.current?.disconnect();
    sessionRef.current = null;
  }, []);

  useEffect(() => {
    getChatNames().then((names) => {
      setMyNameState(names.myName);
      myNameRef.current = names.myName;
      // theirName is filled from the live partner profile
    });
  }, []);

  const setMyName = useCallback(async (name: string) => {
    const nextMine = name.trim().slice(0, 24) || 'You';
    setMyNameState(nextMine);
    myNameRef.current = nextMine;
    await saveChatNames({ myName: nextMine, theirName: 'Them' });
    sessionRef.current?.setDisplayName(nextMine);
  }, []);

  const startSession = useCallback(
    async (nextCode: string) => {
      teardown();
      const normalized = normalizeDateCode(nextCode);
      setCode(normalized);
      setPartnerConnected(false);
      setSyncState(createEmptySyncState());
      setChatMessages([]);
      setPartnerTyping(false);
      setTheirName('Them');
      setLocalStream(null);
      setRemoteStream(null);
      setCallStatus('idle');
      seqRef.current = 0;
      lastRemoteSeqRef.current = -1;
      lastSentRef.current = null;

      const session = new DateSyncSession({
        onStatus: (next, detail) => {
          setStatus(next);
          setStatusDetail(detail ?? '');
        },
        onPartner: setPartnerConnected,
        onRemoteState: (state) => {
          if (state.seq <= lastRemoteSeqRef.current) return;
          lastRemoteSeqRef.current = state.seq;
          // Ignore echo window — long enough for mobile iframe to settle
          applyRemoteUntilRef.current = Date.now() + 4000;
          setSyncState(state);
          setRemoteRevision((n) => n + 1);
        },
        onRemoteName: (name) => {
          const clean = name.trim().slice(0, 24);
          if (clean) setTheirName(clean);
        },
        onChat: (message) => {
          setPartnerTyping(false);
          if (message.name?.trim()) {
            setTheirName(message.name.trim().slice(0, 24));
          }
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            const next = [
              ...prev,
              {
                id: message.id,
                clientId: message.clientId,
                text: message.text,
                createdAt: message.createdAt,
                senderName: message.name || 'Them',
                mine: false,
                status: 'delivered' as const,
              },
            ];
            return next.length > MAX_CHAT ? next.slice(-MAX_CHAT) : next;
          });
        },
        onChatAck: (id, ackStatus) => {
          setChatMessages((prev) =>
            prev.map((m) => {
              if (!m.mine || m.id !== id) return m;
              const rank = { sending: 0, sent: 1, delivered: 2, seen: 3 } as const;
              const current = m.status ?? 'sent';
              if (rank[ackStatus] < rank[current]) return m;
              return { ...m, status: ackStatus };
            })
          );
        },
        onTyping: (isTyping) => {
          setPartnerTyping(isTyping);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          if (isTyping) {
            typingTimerRef.current = setTimeout(() => {
              setPartnerTyping(false);
            }, 4000);
          }
        },
        onLocalStream: setLocalStream,
        onRemoteStream: (stream) => {
          setRemoteStream(stream);
          if (stream) setCallStatus('active');
        },
        onCallInvite: () => {
          setCallStatus((prev) => (prev === 'active' ? prev : 'connecting'));
        },
        onCallEnded: () => {
          setCallStatus('idle');
          setLocalStream(null);
          setRemoteStream(null);
        },
      });
      session.setDisplayName(myNameRef.current);
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
    setPartnerTyping(false);
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('idle');
  }, [teardown]);

  const startVideoCall = useCallback(async () => {
    if (!partnerConnected || !sessionRef.current) {
      throw new Error('Partner is not connected yet');
    }
    setCallStatus('connecting');
    try {
      await sessionRef.current.startVideoCall();
    } catch (err) {
      setCallStatus('idle');
      throw err;
    }
  }, [partnerConnected]);

  const endVideoCall = useCallback(() => {
    sessionRef.current?.endVideoCall();
    setCallStatus('idle');
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

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

      const prev = lastSentRef.current;
      if (
        prev?.media &&
        prev.status === input.status &&
        Math.abs(prev.progress - input.progress) < 1.5 &&
        (prev.media.imdbId ?? prev.media.tmdbId) ===
          (input.media.imdbId ?? input.media.tmdbId) &&
        prev.media.season === input.media.season &&
        prev.media.episode === input.media.episode
      ) {
        return;
      }

      seqRef.current += 1;
      const next: DateSyncState = {
        media: input.media,
        status: input.status,
        progress: Math.max(0, input.progress),
        updatedAt: Date.now(),
        seq: seqRef.current,
      };
      lastSentRef.current = next;
      setSyncState(next);
      sessionRef.current.sendState(next);
    },
    [partnerConnected, shouldIgnoreLocalBroadcast]
  );

  const sendChat = useCallback(
    (text: string) => {
      if (!partnerConnected || !sessionRef.current) return;
      sessionRef.current.sendTyping(false);
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
            senderName: sent.name,
            mine: true,
            status: 'sent' as const,
          },
        ];
        return next.length > MAX_CHAT ? next.slice(-MAX_CHAT) : next;
      });
    },
    [partnerConnected]
  );

  const markMessagesSeen = useCallback(() => {
    if (!partnerConnected || !sessionRef.current) return;
    const unseen = chatMessages.filter((m) => !m.mine && m.status !== 'seen');
    if (unseen.length === 0) return;
    for (const msg of unseen) {
      sessionRef.current.sendChatAck(msg.id, 'seen');
    }
    setChatMessages((prev) =>
      prev.map((m) => (!m.mine ? { ...m, status: 'seen' as const } : m))
    );
  }, [partnerConnected, chatMessages]);

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!partnerConnected || !sessionRef.current) return;
      sessionRef.current.sendTyping(isTyping);
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
      partnerTyping,
      myName,
      theirName,
      localStream,
      remoteStream,
      callStatus,
      setMyName,
      createAndJoin,
      joinWithCode,
      leave,
      broadcastPlayback,
      sendChat,
      markMessagesSeen,
      setTyping,
      shouldIgnoreLocalBroadcast,
      startVideoCall,
      endVideoCall,
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
      partnerTyping,
      myName,
      theirName,
      localStream,
      remoteStream,
      callStatus,
      setMyName,
      createAndJoin,
      joinWithCode,
      leave,
      broadcastPlayback,
      sendChat,
      markMessagesSeen,
      setTyping,
      shouldIgnoreLocalBroadcast,
      startVideoCall,
      endVideoCall,
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
