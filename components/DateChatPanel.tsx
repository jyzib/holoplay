import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDateSync } from '../context/DateSyncContext';
import { colors, radius, spacing, typography } from '../constants/theme';
import type { DateChatMessage } from '../types/dateSync';

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function DateChatPanel() {
  const insets = useSafeAreaInsets();
  const { chatMessages, sendChat, partnerConnected, myName, theirName } =
    useDateSync();
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<DateChatMessage>>(null);

  useEffect(() => {
    if (chatMessages.length === 0) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(t);
  }, [chatMessages.length]);

  if (!partnerConnected) return null;

  const onSend = () => {
    const text = draft.trim();
    if (!text) return;
    sendChat(text);
    setDraft('');
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.header}>
        <Ionicons name="chatbubbles" size={14} color={colors.netflixRed} />
        <Text style={styles.headerText}>Chat</Text>
      </View>

      <FlatList
        ref={listRef}
        data={chatMessages}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.empty}>Say hi — messages stay between you two.</Text>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubbleRow,
              item.mine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
            ]}
          >
            <View
              style={[
                styles.bubble,
                item.mine ? styles.bubbleMine : styles.bubbleTheirs,
              ]}
            >
              <Text style={styles.bubbleLabel}>
                {item.senderName || (item.mine ? myName : theirName)} ·{' '}
                {formatTime(item.createdAt)}
              </Text>
              <Text style={styles.bubbleText}>{item.text}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message…"
          placeholderTextColor={colors.textMuted}
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={onSend}
          // @ts-expect-error web-only: remove browser focus ring
          outlineStyle="none"
        />
        <Pressable
          style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]}
          onPress={onSend}
          disabled={!draft.trim()}
        >
          <Ionicons name="send" size={16} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 210,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  headerText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  list: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.sm,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  bubbleRow: {
    marginBottom: 6,
    flexDirection: 'row',
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubbleRowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleMine: {
    backgroundColor: colors.netflixRed,
  },
  bubbleTheirs: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleLabel: {
    ...typography.label,
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
    textTransform: 'none',
    letterSpacing: 0,
  },
  bubbleText: {
    ...typography.body,
    color: colors.text,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.netflixRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
