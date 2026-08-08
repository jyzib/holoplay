import { createElement, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDateSync } from '../context/DateSyncContext';
import { colors, radius, spacing, typography } from '../constants/theme';

const DEFAULT_HEIGHT = 230;
const COMPACT_HEIGHT = 190;

function WebVideo({
  stream,
  muted,
  mirror,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) {
      void el.play().catch(() => {
        // Autoplay may be blocked until user gesture
      });
    }
  }, [stream]);

  if (Platform.OS !== 'web') return null;

  return createElement('video', {
    ref: videoRef,
    autoPlay: true,
    playsInline: true,
    muted: !!muted,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      backgroundColor: '#000',
      transform: mirror ? 'scaleX(-1)' : undefined,
    },
  });
}

export function DateVideoCall({
  compact = false,
  height,
  onSwitchToChat,
}: {
  compact?: boolean;
  height?: number;
  onSwitchToChat: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const {
    theirName,
    localStream,
    remoteStream,
    callStatus,
    startVideoCall,
    endVideoCall,
  } = useDateSync();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const maxHeight = Math.max(DEFAULT_HEIGHT, Math.round(windowHeight * 0.72));
  const sheetHeight = Math.min(
    height ?? DEFAULT_HEIGHT,
    compact ? COMPACT_HEIGHT : maxHeight
  );

  const inCall = callStatus === 'active' || !!localStream || !!remoteStream;
  const connecting = callStatus === 'connecting' || busy;

  const onStart = async () => {
    setError(null);
    setBusy(true);
    try {
      await startVideoCall();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start video call');
    } finally {
      setBusy(false);
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <View
        style={[
          styles.wrap,
          {
            height: sheetHeight,
            paddingBottom: compact ? 6 : Math.max(insets.bottom, 8),
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.headerText}>Video</Text>
          <Pressable onPress={onSwitchToChat} style={styles.switchBtn} hitSlop={8}>
            <Ionicons name="chatbubble-outline" size={15} color={colors.text} />
            <Text style={styles.switchText}>Chat</Text>
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text style={styles.sub}>Video calls work in the browser.</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          height: sheetHeight,
          paddingBottom: compact ? 6 : Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="videocam" size={14} color={colors.netflixRed} />
          <Text style={styles.headerText}>Video</Text>
          {inCall ? <View style={styles.liveDot} /> : null}
        </View>
        <Pressable
          onPress={onSwitchToChat}
          style={styles.switchBtn}
          hitSlop={8}
          accessibilityLabel="Switch to chat"
        >
          <Ionicons name="chatbubble-outline" size={15} color={colors.text} />
          <Text style={styles.switchText}>Chat</Text>
        </Pressable>
      </View>

      <View style={styles.stage}>
        {remoteStream ? (
          <WebVideo stream={remoteStream} />
        ) : (
          <View style={styles.placeholder}>
            {connecting ? (
              <>
                <ActivityIndicator color={colors.netflixRed} />
                <Text style={styles.placeholderText}>Connecting to {theirName}…</Text>
              </>
            ) : (
              <>
                <Ionicons name="person-circle-outline" size={40} color={colors.textMuted} />
                <Text style={styles.placeholderText}>
                  {inCall ? `Waiting for ${theirName}` : 'Start a video call'}
                </Text>
              </>
            )}
          </View>
        )}

        {localStream ? (
          <View style={styles.pip}>
            <WebVideo stream={localStream} muted mirror />
          </View>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.controls}>
        {inCall ? (
          <Pressable style={[styles.btn, styles.endBtn]} onPress={endVideoCall}>
            <Ionicons name="call" size={16} color={colors.text} />
            <Text style={styles.btnText}>End</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.btn, styles.startBtn, busy && styles.btnDisabled]}
            onPress={onStart}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <Ionicons name="videocam" size={16} color={colors.text} />
            )}
            <Text style={styles.btnText}>{connecting ? 'Starting…' : 'Start call'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  switchText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
  stage: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
    minHeight: 80,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  placeholderText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  pip: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 72,
    height: 96,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: colors.surface,
  },
  controls: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    minWidth: 120,
    justifyContent: 'center',
  },
  startBtn: {
    backgroundColor: colors.netflixRed,
  },
  endBtn: {
    backgroundColor: '#B91C1C',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
  error: {
    ...typography.caption,
    color: colors.warning,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  sub: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
