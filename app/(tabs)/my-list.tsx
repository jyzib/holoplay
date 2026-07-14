import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FooterCredit } from '../../components/FooterCredit';
import { Header } from '../../components/Header';
import { LoadingState } from '../../components/LoadingState';
import { PosterCard } from '../../components/PosterCard';
import { colors, spacing, typography } from '../../constants/theme';
import { formatProgress, getAllProgress } from '../../services/watchProgress';
import type { WatchProgressEntry } from '../../types/vidapi';

export default function MyListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<WatchProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getAllProgress()
        .then(setItems)
        .finally(() => setLoading(false));
    }, [])
  );

  const resume = (item: WatchProgressEntry) => {
    router.push({
      pathname: '/player',
      params: {
        type: item.mediaType,
        imdbId: item.imdbId,
        tmdbId: item.tmdbId,
        season: item.season != null ? String(item.season) : undefined,
        episode: item.episode != null ? String(item.episode) : undefined,
        title: item.title,
        poster: item.poster,
        resumeAt: String(Math.floor(item.progress)),
      },
    });
  };

  if (loading) {
    return <LoadingState message="Loading your list..." />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="My List" />
      {items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>
              Start watching and your progress will appear here automatically.
            </Text>
          </View>
          <FooterCredit />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          ListFooterComponent={<FooterCredit />}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <PosterCard
                title={item.title}
                posterUrl={item.poster}
                subtitle={formatProgress(item.progress, item.duration)}
                progress={item.progress}
                duration={item.duration}
                onPress={() => resume(item)}
                size="large"
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardWrap: {
    width: '48%',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'space-between',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
