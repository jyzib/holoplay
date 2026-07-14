import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ContentRow, type ContentRowItem } from '../../components/ContentRow';
import { FooterCredit } from '../../components/FooterCredit';
import { Header } from '../../components/Header';
import { HeroBanner } from '../../components/HeroBanner';
import { HomeSearchBar } from '../../components/HomeSearchBar';
import { LoadingState } from '../../components/LoadingState';
import { SearchResultRow } from '../../components/SearchResultRow';
import { colors, spacing, typography } from '../../constants/theme';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { searchImdbTitles } from '../../services/imdbSearch';
import {
  fetchLatestEpisodes,
  fetchLatestMovies,
  fetchLatestTvShows,
  getProgressKey,
} from '../../services/vidapi';
import { getAllProgress } from '../../services/watchProgress';
import type { ImdbTitleResult } from '../../types/imdb';
import type { EpisodeItem, MovieItem, TvShowItem } from '../../types/vidapi';

function buildProgressMap(
  progress: Awaited<ReturnType<typeof getAllProgress>>
): Record<string, { progress: number; duration: number }> {
  const map: Record<string, { progress: number; duration: number }> = {};
  for (const entry of progress) {
    map[entry.id] = {
      progress: entry.progress,
      duration: entry.duration,
    };
  }
  return map;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [tvShows, setTvShows] = useState<TvShowItem[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, { progress: number; duration: number }>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 350);
  const [results, setResults] = useState<ImdbTitleResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const hasQuery = searchQuery.trim().length >= 2;

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setResults([]);
    setSearchError('');
    setSearching(false);
  }, []);

  const loadContent = useCallback(async () => {
    const [moviesData, tvData, episodesData, progress] = await Promise.all([
      fetchLatestMovies(1),
      fetchLatestTvShows(1),
      fetchLatestEpisodes(1),
      getAllProgress(),
    ]);

    setMovies(moviesData.items);
    setTvShows(tvData.items);
    setEpisodes(episodesData.items);

    setProgressMap(buildProgressMap(progress));
  }, []);

  useEffect(() => {
    let active = true;

    // Movies power the hero and first row, so render them as soon as they arrive.
    Promise.all([fetchLatestMovies(1), getAllProgress()])
      .then(([moviesData, progress]) => {
        if (!active) return;
        setMovies(moviesData.items);
        setProgressMap(buildProgressMap(progress));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    // Secondary rows load independently instead of blocking the first paint.
    fetchLatestTvShows(1)
      .then((data) => {
        if (active) setTvShows(data.items);
      })
      .catch(() => {});

    fetchLatestEpisodes(1)
      .then((data) => {
        if (active) setEpisodes(data.items);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const query = debouncedQuery.trim();
      if (query.length < 2) {
        setResults([]);
        setSearching(false);
        setSearchError('');
        return;
      }

      setSearching(true);
      setSearchError('');
      try {
        const next = await searchImdbTitles(query);
        if (!cancelled) setResults(next);
      } catch {
        if (!cancelled) {
          setResults([]);
          setSearchError('Could not search titles. Try again.');
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const onRefresh = useCallback(async () => {
    if (searchOpen) return;
    setRefreshing(true);
    await loadContent().catch(() => {});
    setRefreshing(false);
  }, [searchOpen, loadContent]);

  const featured = movies[0];

  const featuredProgress = featured
    ? progressMap[getProgressKey(featured.imdb_id, featured.tmdb_id)]
    : undefined;

  const movieRows: ContentRowItem[] = useMemo(
    () =>
      movies.map((m) => ({
        id: m.imdb_id,
        title: m.title,
        posterUrl: m.poster_url,
        subtitle: m.year,
        ...progressMap[getProgressKey(m.imdb_id, m.tmdb_id)],
      })),
    [movies, progressMap]
  );

  const tvRows: ContentRowItem[] = useMemo(
    () =>
      tvShows.map((t) => ({
        id: t.imdb_id,
        title: t.title,
        posterUrl: t.poster_url,
        subtitle: t.year,
      })),
    [tvShows]
  );

  const episodeRows: ContentRowItem[] = useMemo(
    () =>
      episodes.map((e) => ({
        id: `${e.show_imdb_id}_${e.season_number}x${e.episode_number}`,
        title: e.episode_title || e.show_title,
        posterUrl: undefined,
        subtitle: `${e.show_title} · S${e.season_number}E${e.episode_number}`,
        ...progressMap[
          getProgressKey(
            e.show_imdb_id,
            e.show_tmdb_id,
            Number(e.season_number),
            Number(e.episode_number)
          )
        ],
      })),
    [episodes, progressMap]
  );

  const openMovie = (imdbId: string) => {
    router.push(`/movie/${imdbId}`);
  };

  const openTv = (imdbId: string) => {
    router.push(`/tv/${imdbId}`);
  };

  const openTitle = (item: ImdbTitleResult) => {
    if (item.mediaType === 'movie') {
      openMovie(item.imdbId);
    } else {
      openTv(item.imdbId);
    }
  };

  const playTitle = (item: ImdbTitleResult) => {
    router.push({
      pathname: '/player',
      params: {
        type: item.mediaType,
        imdbId: item.imdbId,
        season: item.mediaType === 'tv' ? '1' : undefined,
        episode: item.mediaType === 'tv' ? '1' : undefined,
        title: item.title,
        poster: item.posterUrl,
      },
    });
  };

  const playFeatured = () => {
    if (!featured) return;
    router.push({
      pathname: '/player',
      params: {
        type: 'movie',
        imdbId: featured.imdb_id,
        tmdbId: featured.tmdb_id,
        title: featured.title,
        poster: featured.poster_url,
        resumeAt: featuredProgress?.progress
          ? String(Math.floor(featuredProgress.progress))
          : undefined,
      },
    });
  };

  if (loading) {
    return <LoadingState message="Loading your catalog..." />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        rightAction={
          <Pressable
            onPress={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={searchOpen ? 'Close search' : 'Search'}
          >
            <Ionicons
              name={searchOpen ? 'close' : 'search'}
              size={24}
              color={colors.text}
            />
          </Pressable>
        }
      />

      {searchOpen ? (
        <HomeSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
      ) : null}

      {searchOpen ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.searchContent}
        >
          {!hasQuery ? (
            <Text style={styles.emptyText}>
              Start typing to search movies and TV shows
            </Text>
          ) : (
            <>
              <Text style={styles.sectionLabel}>
                {searching ? 'Searching...' : 'Top Results'}
              </Text>

              {searching ? (
                <View style={styles.statusRow}>
                  <ActivityIndicator color={colors.netflixRed} />
                </View>
              ) : null}

              {searchError ? (
                <Text style={styles.errorText}>{searchError}</Text>
              ) : null}

              {!searching && !searchError && results.length === 0 ? (
                <Text style={styles.emptyText}>
                  No titles found for “{searchQuery.trim()}”
                </Text>
              ) : null}

              {results.map((item) => (
                <SearchResultRow
                  key={item.imdbId}
                  item={item}
                  variant="netflix"
                  onPress={() => openTitle(item)}
                  onPlay={() => playTitle(item)}
                />
              ))}
            </>
          )}
          <FooterCredit />
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.netflixRed}
            />
          }
        >
          {featured ? (
            <HeroBanner
              title={featured.title}
              subtitle={featured.year}
              posterUrl={featured.poster_url}
              rating={featured.rating}
              genre={featured.genre}
              onPlay={playFeatured}
              onMoreInfo={() => openMovie(featured.imdb_id)}
              resumeLabel={featuredProgress?.progress ? 'Resume' : 'Play'}
            />
          ) : null}

          <ContentRow
            title="Latest Movies"
            items={movieRows}
            onItemPress={(item) => openMovie(item.id)}
          />
          <ContentRow
            title="Latest TV Shows"
            items={tvRows}
            onItemPress={(item) => openTv(item.id)}
          />
          <ContentRow
            title="Latest Episodes"
            items={episodeRows}
            onItemPress={(item) => {
              const ep = episodes.find(
                (e) =>
                  `${e.show_imdb_id}_${e.season_number}x${e.episode_number}` === item.id
              );
              if (!ep) return;
              router.push({
                pathname: '/player',
                params: {
                  type: 'tv',
                  imdbId: ep.show_imdb_id,
                  tmdbId: ep.show_tmdb_id,
                  season: ep.season_number,
                  episode: ep.episode_number,
                  title: `${ep.show_title} · S${ep.season_number}E${ep.episode_number}`,
                },
              });
            }}
          />
          <FooterCredit />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  sectionLabel: {
    ...typography.subtitle,
    color: colors.text,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  statusRow: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.netflixRed,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
});
