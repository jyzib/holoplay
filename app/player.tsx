import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PlayerWebView } from '../components/PlayerWebView';
import {
  shouldApplyRemoteSeek,
  useDateSync,
} from '../context/DateSyncContext';
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

  const {
    partnerConnected,
    syncState,
    remoteRevision,
    broadcastPlayback,
    shouldIgnoreLocalBroadcast,
  } = useDateSync();

  const [resumeAt, setResumeAt] = useState(
    params.resumeAt ? Number(params.resumeAt) : 0
  );
  const [autoplay, setAutoplay] = useState(true);
  const [playerKey, setPlayerKey] = useState(0);
  const localProgressRef = useRef(resumeAt);
  const lastBroadcastStatus = useRef<string | null>(null);
  const appliedRemoteRevision = useRef(0);

  const media = useMemo(
    () => ({
      type: (params.type ?? 'movie') as 'movie' | 'tv',
      imdbId: params.imdbId,
      tmdbId: params.tmdbId,
      season: params.season ? Number(params.season) : undefined,
      episode: params.episode ? Number(params.episode) : undefined,
      title: params.title,
      poster: params.poster,
    }),
    [params]
  );

  const embedUrl = useMemo(() => {
    return buildEmbedUrl(media.type, {
      imdbId: media.imdbId,
      tmdbId: media.tmdbId,
      season: media.season,
      episode: media.episode,
      resumeAt: resumeAt > 0 ? resumeAt : undefined,
      autoplay,
      primaryColor: '#E50914',
      lang: 'en',
    });
  }, [media, resumeAt, autoplay]);

  // When partner starts a different title while we're idle elsewhere, open it.
  // When partner controls while we're already here, remount at their progress.
  useEffect(() => {
    if (!partnerConnected || remoteRevision === 0) return;
    if (remoteRevision === appliedRemoteRevision.current) return;
    const remote = syncState;
    if (!remote.media) return;

    appliedRemoteRevision.current = remoteRevision;

    const sameTitle =
      (remote.media.imdbId && remote.media.imdbId === media.imdbId) ||
      (remote.media.tmdbId && remote.media.tmdbId === media.tmdbId);

    const sameEpisode =
      remote.media.type === 'movie' ||
      (remote.media.season === media.season &&
        remote.media.episode === media.episode);

    if (!sameTitle || !sameEpisode) {
      router.replace({
        pathname: '/player',
        params: {
          type: remote.media.type,
          imdbId: remote.media.imdbId,
          tmdbId: remote.media.tmdbId,
          season:
            remote.media.season != null ? String(remote.media.season) : undefined,
          episode:
            remote.media.episode != null
              ? String(remote.media.episode)
              : undefined,
          title: remote.media.title,
          poster: remote.media.poster,
          resumeAt: String(Math.floor(remote.progress)),
        },
      });
      return;
    }

    if (
      !shouldApplyRemoteSeek(
        localProgressRef.current,
        remote.progress,
        remote.status
      ) &&
      remote.status === 'playing' &&
      autoplay
    ) {
      return;
    }

    setResumeAt(Math.floor(remote.progress));
    setAutoplay(remote.status === 'playing');
    setPlayerKey((k) => k + 1);
  }, [
    partnerConnected,
    remoteRevision,
    syncState,
    media.imdbId,
    media.tmdbId,
    media.season,
    media.episode,
    router,
    autoplay,
  ]);

  // If partner starts playback while we're not on player for that title,
  // other screens listen via a small bridge effect in the provider consumers.
  // Home/detail use broadcast on play; this effect handles incoming when already mounted.

  const publish = useCallback(
    (status: 'playing' | 'paused', progress: number) => {
      if (!partnerConnected) return;
      if (shouldIgnoreLocalBroadcast()) return;

      // Avoid flooding on periodic "playing" ticks unless status changed a lot
      const statusKey = `${status}:${Math.floor(progress)}`;
      if (
        status === 'playing' &&
        lastBroadcastStatus.current?.startsWith('playing:') &&
        Math.abs(
          Number(lastBroadcastStatus.current.split(':')[1] ?? 0) - progress
        ) < 4
      ) {
        return;
      }
      lastBroadcastStatus.current = statusKey;

      broadcastPlayback({
        media,
        status,
        progress,
      });
    },
    [
      partnerConnected,
      shouldIgnoreLocalBroadcast,
      broadcastPlayback,
      media,
    ]
  );

  const handlePlayerEvent = useCallback(
    (event: PlayerEvent) => {
      const { player_status, player_progress } = event.data;
      localProgressRef.current = player_progress;

      if (
        player_status === 'playing' ||
        player_status === 'paused' ||
        player_status === 'seeked'
      ) {
        publish(
          player_status === 'paused' ? 'paused' : 'playing',
          player_progress
        );
      }
    },
    [publish]
  );

  const handleCompleted = useCallback(
    (event: PlayerEvent) => {
      const { player_info } = event.data;
      if (
        player_info.mediaType === 'tv' &&
        player_info.season != null &&
        player_info.episode != null
      ) {
        const nextEpisode = player_info.episode + 1;
        const nextMedia = {
          ...media,
          season: player_info.season,
          episode: nextEpisode,
          title: `${player_info.title ?? 'TV Show'} · S${player_info.season}E${nextEpisode}`,
        };
        if (partnerConnected) {
          broadcastPlayback({
            media: nextMedia,
            status: 'playing',
            progress: 0,
          });
        }
        router.setParams({
          season: String(player_info.season),
          episode: String(nextEpisode),
          resumeAt: undefined,
          title: nextMedia.title,
        });
        setResumeAt(0);
        setAutoplay(true);
        setPlayerKey((k) => k + 1);
      }
    },
    [router, media, partnerConnected, broadcastPlayback]
  );

  // Announce current title when opening player while paired
  useEffect(() => {
    if (!partnerConnected) return;
    if (shouldIgnoreLocalBroadcast()) return;
    broadcastPlayback({
      media,
      status: 'playing',
      progress: resumeAt,
    });
    // only on mount / media identity change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerConnected, media.imdbId, media.tmdbId, media.season, media.episode]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {params.title ?? 'Now Playing'}
        </Text>
        <View style={styles.spacer}>
          {partnerConnected ? (
            <Ionicons name="heart" size={18} color={colors.netflixRed} />
          ) : null}
        </View>
      </View>
      {partnerConnected ? (
        <Text style={styles.syncBanner}>Movie Date synced</Text>
      ) : null}
      <PlayerWebView
        key={playerKey}
        embedUrl={embedUrl}
        onPlayerEvent={handlePlayerEvent}
        onCompleted={handleCompleted}
      />
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
    alignItems: 'flex-end',
  },
  syncBanner: {
    ...typography.caption,
    color: colors.netflixRed,
    textAlign: 'center',
    paddingVertical: 4,
    backgroundColor: colors.surfaceElevated,
  },
});
