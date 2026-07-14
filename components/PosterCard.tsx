import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, poster, radius, typography } from '../constants/theme';

interface PosterCardProps {
  title: string;
  posterUrl?: string;
  subtitle?: string;
  progress?: number;
  duration?: number;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
}

const SIZES = {
  small: { width: 100, height: 150 },
  medium: { width: poster.width, height: poster.height },
  large: { width: 140, height: 210 },
};

export function PosterCard({
  title,
  posterUrl,
  subtitle,
  progress,
  duration,
  onPress,
  size = 'medium',
}: PosterCardProps) {
  const dimensions = SIZES[size];
  const progressPct =
    progress != null && duration != null && duration > 0
      ? Math.min((progress / duration) * 100, 100)
      : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={[styles.posterWrap, dimensions]}>
        {posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            style={[styles.poster, dimensions]}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.poster, styles.placeholder, dimensions]} />
        )}
        {progressPct > 0 ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>{title}</Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 10,
    width: poster.width,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  posterWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  poster: {
    borderRadius: radius.md,
  },
  placeholder: {
    backgroundColor: colors.surfaceElevated,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.netflixRed,
  },
  title: {
    ...typography.caption,
    color: colors.text,
    marginTop: 6,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
