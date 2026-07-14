import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PlayerWebView } from '../components/PlayerWebView';
import { colors, spacing, typography } from '../constants/theme';
import { buildEmbedUrl } from '../services/vidapi';
import type { PlayerEvent } from '../types/vidapi';

export default function PlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    type: 'movie' | 'tv';
    imdbId?: string;
    tmdbId?: string;
    season?: string;
    episode?: string;
    title?: string;
    poster?: string;
    resumeAt?: string;
  }>();

  const embedUrl = useMemo(() => {
    return buildEmbedUrl(params.type ?? 'movie', {
      imdbId: params.imdbId,
      tmdbId: params.tmdbId,
      season: params.season ? Number(params.season) : undefined,
      episode: params.episode ? Number(params.episode) : undefined,
      resumeAt: params.resumeAt ? Number(params.resumeAt) : undefined,
      autoplay: true,
      primaryColor: '#E50914',
      lang: 'en',
    });
  }, [params]);

  const handleCompleted = useCallback(
    (event: PlayerEvent) => {
      const { player_info } = event.data;
      if (player_info.mediaType === 'tv' && player_info.season != null && player_info.episode != null) {
        const nextEpisode = player_info.episode + 1;
        router.setParams({
          season: String(player_info.season),
          episode: String(nextEpisode),
          resumeAt: undefined,
          title: `${player_info.title ?? 'TV Show'} · S${player_info.season}E${nextEpisode}`,
        });
      }
    },
    [router]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {params.title ?? 'Now Playing'}
        </Text>
        <View style={styles.spacer} />
      </View>
      <PlayerWebView embedUrl={embedUrl} onCompleted={handleCompleted} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 40,
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  spacer: {
    width: 40,
  },
});
