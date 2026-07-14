import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../constants/theme';
import { getPosterImageUrl } from '../services/images';
import type { ImdbTitleResult } from '../types/imdb';

interface SearchResultRowProps {
  item: ImdbTitleResult;
  onPress: () => void;
  onPlay?: () => void;
  variant?: 'card' | 'netflix';
}

export function SearchResultRow({
  item,
  onPress,
  onPlay,
  variant = 'card',
}: SearchResultRowProps) {
  const optimizedPosterUrl = getPosterImageUrl(item.posterUrl, 240);

  if (variant === 'netflix') {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.netflixRow, pressed && styles.pressed]}
      >
        {optimizedPosterUrl ? (
          <Image
            source={{ uri: optimizedPosterUrl }}
            style={styles.netflixPoster}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={optimizedPosterUrl}
            transition={100}
          />
        ) : (
          <View style={[styles.netflixPoster, styles.posterPlaceholder]} />
        )}
        <Text style={styles.netflixTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Pressable
          onPress={onPlay ?? onPress}
          hitSlop={8}
          style={styles.playButton}
          accessibilityRole="button"
          accessibilityLabel={`Play ${item.title}`}
        >
          <Ionicons name="play" size={18} color={colors.text} />
        </Pressable>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {optimizedPosterUrl ? (
        <Image
          source={{ uri: optimizedPosterUrl }}
          style={styles.poster}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={optimizedPosterUrl}
          transition={100}
        />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]} />
      )}
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  netflixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  poster: {
    width: 52,
    height: 78,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
  },
  netflixPoster: {
    width: 120,
    height: 68,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
  },
  posterPlaceholder: {
    backgroundColor: colors.surfaceElevated,
  },
  meta: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
  },
  netflixTitle: {
    ...typography.subtitle,
    color: colors.text,
    flex: 1,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
});
