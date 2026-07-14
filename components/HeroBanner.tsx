import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, poster, spacing, typography } from '../constants/theme';
import { getHeroImageUrl } from '../services/images';

interface HeroBannerProps {
  title: string;
  subtitle?: string;
  posterUrl?: string;
  rating?: string;
  genre?: string;
  onPlay: () => void;
  onMoreInfo?: () => void;
  resumeLabel?: string;
}

export function HeroBanner({
  title,
  subtitle,
  posterUrl,
  rating,
  genre,
  onPlay,
  onMoreInfo,
  resumeLabel,
}: HeroBannerProps) {
  const optimizedPosterUrl = getHeroImageUrl(posterUrl);

  return (
    <View style={styles.container}>
      {optimizedPosterUrl ? (
        <Image
          source={{ uri: optimizedPosterUrl }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="high"
          transition={150}
        />
      ) : (
        <View style={[styles.image, styles.placeholder]} />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(11,11,15,0.4)', colors.background]}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      />
      <View style={styles.content}>
        <Text style={styles.badge}>FEATURED</Text>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.meta}>
          {rating ? (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color={colors.warning} />
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
          ) : null}
          {genre ? <Text style={styles.genre} numberOfLines={1}>{genre}</Text> : null}
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.playButton} onPress={onPlay}>
            <Ionicons name="play" size={22} color={colors.text} />
            <Text style={styles.playText}>{resumeLabel ?? 'Play'}</Text>
          </Pressable>
          {onMoreInfo ? (
            <Pressable style={styles.infoButton} onPress={onMoreInfo}>
              <Ionicons name="information-circle-outline" size={22} color={colors.text} />
              <Text style={styles.infoText}>More Info</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: poster.heroHeight,
    marginBottom: spacing.md,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: colors.surfaceElevated,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
  },
  badge: {
    ...typography.label,
    color: colors.primeBlue,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.hero,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ratingText: {
    ...typography.caption,
    color: colors.text,
  },
  genre: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.netflixRed,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 6,
    minWidth: 120,
    justifyContent: 'center',
  },
  playText: {
    ...typography.subtitle,
    color: colors.text,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(42, 42, 56, 0.85)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 6,
  },
  infoText: {
    ...typography.subtitle,
    color: colors.text,
  },
});
