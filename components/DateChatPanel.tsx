import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDateSync } from '../context/DateSyncContext';
import { colors, radius, spacing, typography } from '../constants/theme';
import type { ChatDeliveryStatus, DateChatMessage } from '../types/dateSync';

const MIN_HEIGHT = 150;
const DEFAULT_HEIGHT = 230;
const COMPACT_HEIGHT = 190;

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function StatusTicks({ status }: { status?: ChatDeliveryStatus }) {
  if (!status || status === 'sending') {
    return (
      <Ionicons
        name="time-outline"
        size={12}
        color="rgba(255,255,255,0.65)"
        style={styles.tickIcon}
      />
    );
  }
  if (status === 'sent') {
    return (
      <Ionicons
        name="checkmark"
        size={13}
        color="rgba(255,255,255,0.75)"
        style={styles.tickIcon}
      />
    );
  }
  if (status === 'delivered') {
    return (
      <Ionicons
        name="checkmark-done"
        size={13}
        color="rgba(255,255,255,0.75)"
        style={styles.tickIcon}
      />
    );
  }
  return (
    <Ionicons
      name="checkmark-done"
      size={13}
      color="#7DD3FC"
      style={styles.tickIcon}
    />
  );
}

export function DateChatPanel({ compact = false }: { compact?: boolean }) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const {
    chatMessages,
    sendChat,
    partnerConnected,
    myName,
    theirName,
    partnerTyping,
    markMessagesSeen,
    setTyping,
  } = useDateSync();
  const [draft, setDraft] = useState('');
  const [sheetHeight, setSheetHeight] = useState(DEFAULT_HEIGHT);
  const listRef = useRef<FlatList<DateChatMessage>>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasTyping = useRef(false);
  const dragStartHeight = useRef(DEFAULT_HEIGHT);

  const maxHeight = Math.max(
    DEFAULT_HEIGHT,
    Math.round(windowHeight * 0.72)
  );
  const midHeight = Math.round((DEFAULT_HEIGHT + maxHeight) / 2);

  const displayHeight = compact
    ? Math.min(sheetHeight, COMPACT_HEIGHT)
    : sheetHeight;

  const expanded = sheetHeight > DEFAULT_HEIGHT + 40;

  useEffect(() => {
    if (chatMessages.length === 0) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(t);
  }, [chatMessages.length, partnerTyping, displayHeight]);

  useEffect(() => {
    if (!partnerConnected) return;
    markMessagesSeen();
  }, [partnerConnected, chatMessages, markMessagesSeen]);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (wasTyping.current) setTyping(false);
    };
  }, [setTyping]);

  const clamp = (value: number) =>
    Math.min(maxHeight, Math.max(MIN_HEIGHT, value));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderGrant: () => {
          dragStartHeight.current = sheetHeight;
        },
        onPanResponderMove: (_, g) => {
          // Drag up (negative dy) = taller sheet; drag down = shorter
          setSheetHeight(clamp(dragStartHeight.current - g.dy));
        },
        onPanResponderRelease: (_, g) => {
          const next = clamp(dragStartHeight.current - g.dy);
          // Snap to collapsed / mid / expanded
          if (g.vy > 0.9 || next < (MIN_HEIGHT + DEFAULT_HEIGHT) / 2) {
            setSheetHeight(MIN_HEIGHT);
          } else if (g.vy < -0.9 || next > midHeight) {
            setSheetHeight(maxHeight);
          } else {
            setSheetHeight(DEFAULT_HEIGHT);
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sheetHeight, maxHeight, midHeight]
  );

  if (!partnerConnected) return null;

  const onChangeDraft = (text: string) => {
    setDraft(text);
    const typing = text.trim().length > 0;
    if (typing && !wasTyping.current) {
      wasTyping.current = true;
      setTyping(true);
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    if (typing) {
      typingTimeout.current = setTimeout(() => {
        wasTyping.current = false;
        setTyping(false);
      }, 1500);
    } else if (wasTyping.current) {
      wasTyping.current = false;
      setTyping(false);
    }
  };

  const onSend = () => {
    const text = draft.trim();
    if (!text) return;
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    wasTyping.current = false;
    setTyping(false);
    sendChat(text);
    setDraft('');
  };

  const toggleExpand = () => {
    setSheetHeight((h) => (h > DEFAULT_HEIGHT + 20 ? DEFAULT_HEIGHT : maxHeight));
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          height: displayHeight,
          paddingBottom: compact ? 6 : Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={styles.dragZone} {...panResponder.panHandlers}>
        <View style={styles.dragHandle} />
        <View style={styles.header}>
          <Ionicons name="chatbubbles" size={14} color={colors.netflixRed} />
          <Text style={styles.headerText}>Chat</Text>
          {partnerTyping ? (
            <Text style={styles.typingHeader} numberOfLines={1}>
              {theirName} is typing…
            </Text>
          ) : (
            <Text style={styles.dragHint}>Drag handle to resize</Text>
          )}
          <Pressable
            onPress={toggleExpand}
            hitSlop={10}
            style={styles.expandBtn}
            accessibilityLabel={expanded ? 'Shrink chat' : 'Expand chat'}
          >
            <Ionicons
              name={expanded ? 'chevron-down' : 'chevron-up'}
              size={18}
              color={colors.text}
            />
          </Pressable>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={chatMessages}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.empty}>Say hi — messages stay between you two.</Text>
        }
        ListFooterComponent={
          partnerTyping ? (
            <View style={[styles.bubbleRow, styles.bubbleRowTheirs]}>
              <View style={[styles.bubble, styles.bubbleTheirs, styles.typingBubble]}>
                <Text style={styles.typingDots}>•••</Text>
              </View>
            </View>
          ) : null
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
                {item.senderName || (item.mine ? myName : theirName)}
              </Text>
              <Text style={styles.bubbleText}>{item.text}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaTime}>{formatTime(item.createdAt)}</Text>
                {item.mine ? <StatusTicks status={item.status} /> : null}
              </View>
            </View>
          </View>
        )}
      />

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={onChangeDraft}
          placeholder="Type a message…"
          placeholderTextColor={colors.textMuted}
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={onSend}
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
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    overflow: 'hidden',
  },
  dragZone: {
    paddingTop: 6,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingBottom: 4,
  },
  headerText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dragHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: 4,
    flex: 1,
    textTransform: 'none',
  },
  typingHeader: {
    ...typography.caption,
    color: colors.netflixRed,
    flex: 1,
    fontStyle: 'italic',
    textTransform: 'none',
  },
  expandBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
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
  typingBubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  typingDots: {
    color: colors.textSecondary,
    fontSize: 18,
    letterSpacing: 2,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  metaTime: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
  },
  tickIcon: {
    marginTop: 1,
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
