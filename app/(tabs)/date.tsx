import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FooterCredit } from '../../components/FooterCredit';
import { Header } from '../../components/Header';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useDateSync } from '../../context/DateSyncContext';
import { useKeyboardBottomInset } from '../../hooks/useKeyboardBottomInset';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { normalizeDateCode } from '../../services/dateSync';

export default function DateScreen() {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset();
  const { width } = useWindowDimensions();
  const isNarrow = width < 420;
  const {
    supported,
    code,
    status,
    statusDetail,
    partnerConnected,
    myName,
    theirName,
    setMyName,
    createAndJoin,
    joinWithCode,
    leave,
  } = useDateSync();
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myNameDraft, setMyNameDraft] = useState(myName);

  useEffect(() => {
    setMyNameDraft(myName);
  }, [myName]);

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

  const onSaveMyName = useCallback(() => {
    void setMyName(myNameDraft);
  }, [myNameDraft, setMyName]);

  const statusColor =
    status === 'paired'
      ? colors.success
      : status === 'error'
        ? colors.netflixRed
        : status === 'waiting' || status === 'connecting'
          ? colors.warning
          : colors.textMuted;

  const tabBarSpace = 72 + Math.max(insets.bottom, 10);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <Header title="Movie Date" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: tabBarSpace + spacing.lg + keyboardInset,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={[styles.iconWrap, isNarrow && styles.iconWrapSmall]}>
            <Ionicons
              name="heart"
              size={isNarrow ? 22 : 28}
              color={colors.netflixRed}
            />
          </View>
          <Text style={[styles.title, isNarrow && styles.titleSmall]}>
            Watch together
          </Text>
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
              <Text style={styles.namesTitle}>Your chat name</Text>
              <TextInput
                style={styles.nameInputFull}
                value={myNameDraft}
                onChangeText={setMyNameDraft}
                onBlur={onSaveMyName}
                placeholder="e.g. Jazib"
                placeholderTextColor={colors.textMuted}
                maxLength={24}
              />
              <Text style={styles.namesHint}>
                Your messages show as “{myNameDraft.trim() || 'You'} ·” on both
                devices. Their name appears when they set theirs.
              </Text>
              {partnerConnected && theirName !== 'Them' ? (
                <Text style={styles.namesHint}>
                  Connected with {theirName}
                </Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: statusColor }]} />
                <Text style={styles.statusText} numberOfLines={2}>
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
                  <Text
                    style={[styles.code, isNarrow && styles.codeSmall]}
                    selectable
                  >
                    {code}
                  </Text>
                  <Text style={styles.codeHint}>
                    {partnerConnected
                      ? `${theirName} is connected — pick a movie and press Play.`
                      : `Ask ${theirName} to enter this same code.`}
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
                <View style={[styles.joinRow, isNarrow && styles.joinRowStacked]}>
                  <TextInput
                    style={[styles.input, isNarrow && styles.inputStacked]}
                    value={joinCode}
                    onChangeText={(t) =>
                      setJoinCode(normalizeDateCode(t).slice(0, 8))
                    }
                    placeholder="e.g. LOVE42"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={8}
                  />
                  <Pressable
                    style={[
                      styles.joinBtn,
                      isNarrow && styles.joinBtnStacked,
                      busy && styles.joinBtnDisabled,
                    ]}
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
                    <Text style={styles.or}>Different code?</Text>
                    <View
                      style={[styles.joinRow, isNarrow && styles.joinRowStacked]}
                    >
                      <TextInput
                        style={[styles.input, isNarrow && styles.inputStacked]}
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
                        style={[
                          styles.joinBtn,
                          isNarrow && styles.joinBtnStacked,
                          busy && styles.joinBtnDisabled,
                        ]}
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

        <FooterCredit />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  titleSmall: {
    fontSize: 20,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    width: '100%',
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
  namesTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  nameInputFull: {
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  namesHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    ...typography.subtitle,
    color: colors.text,
    flexShrink: 1,
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
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    width: '100%',
  },
  codeLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  code: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 4,
    color: colors.text,
    textAlign: 'center',
    flexWrap: 'wrap',
    fontFamily: Platform.select({ web: 'monospace', default: undefined }),
  },
  codeSmall: {
    fontSize: 26,
    letterSpacing: 3,
  },
  codeHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  actions: {
    gap: spacing.md,
    width: '100%',
  },
  or: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  joinRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    alignItems: 'stretch',
  },
  joinRowStacked: {
    flexDirection: 'column',
  },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },
  inputStacked: {
    flex: undefined,
    width: '100%',
  },
  joinBtn: {
    backgroundColor: colors.netflixRed,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  joinBtnStacked: {
    width: '100%',
    paddingVertical: 12,
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
    paddingBottom: spacing.md,
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
