import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FooterCredit } from '../../components/FooterCredit';
import { Header } from '../../components/Header';
import { LoadingState } from '../../components/LoadingState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { getHeroImageUrl } from '../../services/images';
import { fetchLatestMovies, getProgressKey } from '../../services/vidapi';
import { getProgress } from '../../services/watchProgress';
import type { MovieItem } from '../../types/vidapi';

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [movie, setMovie] = useState<MovieItem | null>(null);
  const [resumeAt, setResumeAt] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchLatestMovies(1);
        const found =
          data.items.find((m) => m.imdb_id === id) ??
          ({
            imdb_id: id,
            tmdb_id: '',
            title: id,
            year: '',
            poster_url: '',
            rating: '',
            genre: '',
            popularity: '',
            type: 'movie',
            embed_url: '',
          } as MovieItem);

        setMovie(found);
        const progress = await getProgress(getProgressKey(id));
        if (progress) setResumeAt(progress.progress);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const play = () => {
    router.push({
      pathname: '/player',
      params: {
        type: 'movie',
        imdbId: id,
        tmdbId: movie?.tmdb_id,
        title: movie?.title ?? id,
        poster: movie?.poster_url,
        resumeAt: resumeAt ? String(Math.floor(resumeAt)) : undefined,
      },
    });
  };

  if (loading) return <LoadingState />;
  if (!movie) return null;

  const heroImageUrl = getHeroImageUrl(movie.poster_url);

  return (
    <View style={styles.container}>
      <ScrollView bounces={false}>
        <View style={styles.hero}>
          {heroImageUrl ? (
            <Image
              source={{ uri: heroImageUrl }}
              style={styles.poster}
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="high"
              transition={150}
            />
          ) : (
            <View style={[styles.poster, styles.posterPlaceholder]} />
          )}
          <LinearGradient
            colors={['transparent', colors.background]}
            style={styles.gradient}
          />
        </View>
        <View style={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.title}>{movie.title}</Text>
          <View style={styles.meta}>
            {movie.year ? <Text style={styles.metaText}>{movie.year}</Text> : null}
            {movie.rating ? (
              <View style={styles.rating}>
                <Ionicons name="star" size={14} color={colors.warning} />
                <Text style={styles.metaText}>{movie.rating}</Text>
              </View>
            ) : null}
          </View>
          {movie.genre ? <Text style={styles.genre}>{movie.genre}</Text> : null}
          <Text style={styles.imdb}>IMDB: {id}</Text>

          <View style={styles.actions}>
            <PrimaryButton
              label={resumeAt ? 'Resume' : 'Play'}
              icon="play"
              onPress={play}
            />
          </View>
          <FooterCredit />
        </View>
      </ScrollView>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Header showBack onBack={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  hero: {
    height: 420,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    backgroundColor: colors.surfaceElevated,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    marginTop: -spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.hero,
    color: colors.text,
    fontSize: 28,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  genre: {
    ...typography.body,
    color: colors.textMuted,
  },
  imdb: {
    ...typography.caption,
    color: colors.primeBlue,
    marginTop: spacing.xs,
  },
  actions: {
    marginTop: spacing.lg,
  },
});
