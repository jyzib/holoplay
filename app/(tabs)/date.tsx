import { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FooterCredit } from '../../components/FooterCredit';
import { Header } from '../../components/Header';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useDateSync } from '../../context/DateSyncContext';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { normalizeDateCode } from '../../services/dateSync';

export default function DateScreen() {
  const insets = useSafeAreaInsets();
  const {
    supported,
    code,
    status,
    statusDetail,
    partnerConnected,
    createAndJoin,
    joinWithCode,
    leave,
  } = useDateSync();
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCreate = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const next = await createAndJoin();
      setJoinCode(next);
    } catch {
      setError('Could not create a date code. Try again.');
    } finally {
      setBusy(false);
    }
  }, [createAndJoin]);

  const onJoin = useCallback(async () => {
    const normalized = normalizeDateCode(joinCode);
    if (normalized.length < 4) {
      setError('Enter the 4–8 character code from your partner.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await joinWithCode(normalized);
    } catch {
      setError('Could not join. Check the code and try again.');
    } finally {
      setBusy(false);
    }
  }, [joinCode, joinWithCode]);

  const statusColor =
    status === 'paired'
      ? colors.success
      : status === 'error'
        ? colors.netflixRed
        : status === 'waiting' || status === 'connecting'
          ? colors.warning
          : colors.textMuted;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Movie Date" />
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="heart" size={28} color={colors.netflixRed} />
          </View>
          <Text style={styles.title}>Watch together</Text>
          <Text style={styles.subtitle}>
            Share one code. When either of you presses play, pause, or seek, both
            devices stay in sync.
          </Text>
        </View>

        {!supported ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Open on the web</Text>
            <Text style={styles.cardText}>
              Movie Date uses a live connection and works in your phone or desktop
              browser on the Holoplay website.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: statusColor }]} />
                <Text style={styles.statusText}>
                  {status === 'idle' && 'Not paired'}
                  {status === 'connecting' && 'Connecting…'}
                  {status === 'waiting' && 'Waiting for partner'}
                  {status === 'paired' && 'Paired'}
                  {status === 'error' && 'Connection issue'}
                </Text>
              </View>
              {statusDetail ? (
                <Text style={styles.detail}>{statusDetail}</Text>
              ) : null}
              {code ? (
                <View style={styles.codeBox}>
                  <Text style={styles.codeLabel}>Your date code</Text>
                  <Text style={styles.code}>{code}</Text>
                  <Text style={styles.codeHint}>
                    {partnerConnected
                      ? 'Partner is connected — pick a movie and press Play.'
                      : 'Ask your partner to enter this same code.'}
                  </Text>
                </View>
              ) : null}
            </View>

            {!code ? (
              <View style={styles.actions}>
                <PrimaryButton
                  label={busy ? 'Starting…' : 'Create date code'}
                  icon="heart"
                  onPress={() => void onCreate()}
                  disabled={busy}
                />
                <Text style={styles.or}>or join with a code</Text>
                <View style={styles.joinRow}>
                  <TextInput
                    style={styles.input}
                    value={joinCode}
                    onChangeText={(t) => setJoinCode(normalizeDateCode(t).slice(0, 8))}
                    placeholder="e.g. LOVE42"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={8}
                  />
                  <Pressable
                    style={[styles.joinBtn, busy && styles.joinBtnDisabled]}
                    onPress={() => void onJoin()}
                    disabled={busy}
                  >
                    <Text style={styles.joinBtnText}>Join</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.actions}>
                {!partnerConnected ? (
                  <>
                    <Text style={styles.or}>Partner has a different code?</Text>
                    <View style={styles.joinRow}>
                      <TextInput
                        style={styles.input}
                        value={joinCode}
                        onChangeText={(t) =>
                          setJoinCode(normalizeDateCode(t).slice(0, 8))
                        }
                        placeholder="Enter their code"
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        maxLength={8}
                      />
                      <Pressable
                        style={[styles.joinBtn, busy && styles.joinBtnDisabled]}
                        onPress={() => void onJoin()}
                        disabled={busy}
                      >
                        <Text style={styles.joinBtnText}>Switch</Text>
                      </Pressable>
                    </View>
                  </>
                ) : null}
                <Pressable style={styles.leaveBtn} onPress={() => void leave()}>
                  <Text style={styles.leaveText}>Leave Movie Date</Text>
                </Pressable>
              </View>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.tips}>
              <Text style={styles.tipTitle}>How it works</Text>
              <Text style={styles.tip}>1. Both open Holoplay on the web</Text>
              <Text style={styles.tip}>2. Create or join the same date code</Text>
              <Text style={styles.tip}>
                3. Either of you starts a movie — it opens on both devices
              </Text>
              <Text style={styles.tip}>
                4. Pause / seek on one side mirrors on the other
              </Text>
            </View>
          </>
        )}
      </View>
      <FooterCredit />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  cardText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    ...typography.subtitle,
    color: colors.text,
  },
  detail: {
    ...typography.caption,
    color: colors.textMuted,
  },
  codeBox: {
    marginTop: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
  },
  codeLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  code: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 6,
    color: colors.text,
    fontFamily: Platform.select({ web: 'monospace', default: undefined }),
  },
  codeHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
  or: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  joinRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    // @ts-expect-error web-only
    outlineStyle: 'none',
  },
  joinBtn: {
    backgroundColor: colors.netflixRed,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  joinBtnDisabled: {
    opacity: 0.6,
  },
  joinBtnText: {
    ...typography.subtitle,
    color: colors.text,
  },
  leaveBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  leaveText: {
    ...typography.body,
    color: colors.textMuted,
  },
  error: {
    ...typography.caption,
    color: colors.netflixRed,
    textAlign: 'center',
  },
  tips: {
    gap: spacing.xs,
    paddingBottom: spacing.xl,
  },
  tipTitle: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  tip: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
