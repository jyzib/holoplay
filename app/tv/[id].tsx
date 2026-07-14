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
import { SeasonEpisodePicker } from '../../components/SeasonEpisodePicker';
import { colors, spacing, typography } from '../../constants/theme';
import { getHeroImageUrl } from '../../services/images';
import { fetchLatestTvShows, getProgressKey } from '../../services/vidapi';
import { getProgress } from '../../services/watchProgress';
import type { TvShowItem } from '../../types/vidapi';

export default function TvDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [show, setShow] = useState<TvShowItem | null>(null);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [resumeAt, setResumeAt] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchLatestTvShows(1);
        const found =
          data.items.find((t) => t.imdb_id === id) ??
          ({
            imdb_id: id,
            tmdb_id: '',
            title: id,
            year: '',
            poster_url: '',
            rating: '',
            genre: '',
            popularity: '',
            type: 'tv',
            embed_url: '',
          } as TvShowItem);

        setShow(found);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    getProgress(getProgressKey(id, undefined, season, episode)).then((entry) => {
      setResumeAt(entry?.progress);
    });
  }, [id, season, episode]);

  const play = () => {
    router.push({
      pathname: '/player',
      params: {
        type: 'tv',
        imdbId: id,
        tmdbId: show?.tmdb_id,
        season: String(season),
        episode: String(episode),
        title: `${show?.title ?? id} · S${season}E${episode}`,
        poster: show?.poster_url,
        resumeAt: resumeAt ? String(Math.floor(resumeAt)) : undefined,
      },
    });
  };

  if (loading) return <LoadingState />;
  if (!show) return null;

  const heroImageUrl = getHeroImageUrl(show.poster_url);

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
          <Text style={styles.title}>{show.title}</Text>
          <View style={styles.meta}>
            {show.year ? <Text style={styles.metaText}>{show.year}</Text> : null}
            {show.rating ? (
              <View style={styles.rating}>
                <Ionicons name="star" size={14} color={colors.warning} />
                <Text style={styles.metaText}>{show.rating}</Text>
              </View>
            ) : null}
          </View>
          {show.genre ? <Text style={styles.genre}>{show.genre}</Text> : null}
          <Text style={styles.imdb}>IMDB: {id}</Text>

          <View style={styles.picker}>
            <Text style={styles.pickerLabel}>Select Episode</Text>
            <SeasonEpisodePicker
              season={season}
              episode={episode}
              onChange={(s, e) => {
                setSeason(s);
                setEpisode(e);
              }}
            />
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              label={resumeAt ? `Resume S${season}E${episode}` : `Play S${season}E${episode}`}
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
  picker: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  pickerLabel: {
    ...typography.subtitle,
    color: colors.text,
  },
  actions: {
    marginTop: spacing.lg,
  },
});
