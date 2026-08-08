import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PlayerWebView } from '../components/PlayerWebView';
import { DateChatPanel } from '../components/DateChatPanel';
import { useDateSync } from '../context/DateSyncContext';
import { colors, spacing, typography } from '../constants/theme';
import { buildEmbedUrl } from '../services/vidapi';
import type { PlayerEvent } from '../types/vidapi';

function sameMedia(
  a: {
    imdbId?: string;
    tmdbId?: string;
    type: string;
    season?: number;
    episode?: number;
  },
  b: {
    imdbId?: string;
    tmdbId?: string;
    type: string;
    season?: number;
    episode?: number;
  }
) {
  const idMatch =
    (!!a.imdbId && a.imdbId === b.imdbId) || (!!a.tmdbId && a.tmdbId === b.tmdbId);
  if (!idMatch) return false;
  if (a.type === 'movie' && b.type === 'movie') return true;
  return a.season === b.season && a.episode === b.episode;
}

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
  const [playerKey, setPlayerKey] = useState(0);
  /** When true, iframe is hidden so video/audio stop immediately. */
  const [isPaused, setIsPaused] = useState(false);
  const localProgressRef = useRef(resumeAt);
  const lastBroadcastKind = useRef<'playing' | 'paused' | null>(null);
  const appliedRemoteRevision = useRef(0);
  const announcedMediaKey = useRef('');

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
      autoplay: true,
      primaryColor: '#E50914',
      lang: 'en',
    });
  }, [media, resumeAt]);

  const applyPaused = useCallback((progress: number) => {
    localProgressRef.current = progress;
    setResumeAt(Math.floor(progress));
    setIsPaused(true);
  }, []);

  const applyPlaying = useCallback((progress: number) => {
    localProgressRef.current = progress;
    setResumeAt(Math.floor(progress));
    setIsPaused(false);
    setPlayerKey((k) => k + 1);
  }, []);

  // Partner control → apply locally (pause unmounts iframe instantly)
  useEffect(() => {
    if (!partnerConnected || remoteRevision === 0) return;
    if (remoteRevision === appliedRemoteRevision.current) return;
    const remote = syncState;
    if (!remote.media) return;

    appliedRemoteRevision.current = remoteRevision;

    if (!sameMedia(media, remote.media)) {
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

    if (remote.status === 'paused') {
      lastBroadcastKind.current = 'paused';
      applyPaused(remote.progress);
      return;
    }

    // playing / resume
    const drift = Math.abs(localProgressRef.current - remote.progress);
    if (!isPaused && drift < 2) {
      // Already playing and close enough — skip remount flicker
      localProgressRef.current = remote.progress;
      return;
    }
    lastBroadcastKind.current = 'playing';
    applyPlaying(remote.progress);
  }, [
    partnerConnected,
    remoteRevision,
    syncState,
    media,
    router,
    isPaused,
    applyPaused,
    applyPlaying,
  ]);

  const publish = useCallback(
    (status: 'playing' | 'paused', progress: number, force = false) => {
      if (!partnerConnected) return;
      if (shouldIgnoreLocalBroadcast()) return;

      if (!force && lastBroadcastKind.current === status && status === 'playing') {
        // Throttle progress-only playing updates
        return;
      }
      if (!force && lastBroadcastKind.current === status && status === 'paused') {
        return;
      }

      lastBroadcastKind.current = status;
      broadcastPlayback({ media, status, progress });
    },
    [partnerConnected, shouldIgnoreLocalBroadcast, broadcastPlayback, media]
  );

  const handlePlayerEvent = useCallback(
    (event: PlayerEvent) => {
      const { player_status, player_progress } = event.data;
      localProgressRef.current = player_progress;

      if (player_status === 'paused') {
        setIsPaused(true);
        setResumeAt(Math.floor(player_progress));
        publish('paused', player_progress, true);
        return;
      }

      if (player_status === 'seeked') {
        setResumeAt(Math.floor(player_progress));
        if (isPaused) {
          publish('paused', player_progress, true);
        } else {
          publish('playing', player_progress, true);
        }
        return;
      }

      if (player_status === 'playing') {
        // Ignore play events while we intentionally paused for sync
        if (isPaused) return;
        publish('playing', player_progress, lastBroadcastKind.current !== 'playing');
      }
    },
    [publish, isPaused]
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
        setIsPaused(false);
        setPlayerKey((k) => k + 1);
      }
    },
    [router, media, partnerConnected, broadcastPlayback]
  );

  // Announce title once when opening / switching media while paired
  useEffect(() => {
    if (!partnerConnected) return;
    const key = [
      media.imdbId,
      media.tmdbId,
      media.season,
      media.episode,
    ].join(':');
    if (key === announcedMediaKey.current) return;
    if (shouldIgnoreLocalBroadcast()) return;
    announcedMediaKey.current = key;
    lastBroadcastKind.current = 'playing';
    broadcastPlayback({
      media,
      status: 'playing',
      progress: resumeAt,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerConnected, media.imdbId, media.tmdbId, media.season, media.episode]);

  const onSyncPause = () => {
    const progress = localProgressRef.current;
    applyPaused(progress);
    lastBroadcastKind.current = 'paused';
    if (partnerConnected && !shouldIgnoreLocalBroadcast()) {
      broadcastPlayback({ media, status: 'paused', progress });
    }
  };

  const onSyncPlay = () => {
    const progress = localProgressRef.current;
    applyPlaying(progress);
    lastBroadcastKind.current = 'playing';
    if (partnerConnected && !shouldIgnoreLocalBroadcast()) {
      broadcastPlayback({ media, status: 'playing', progress });
    }
  };

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
        <View style={styles.syncBar}>
          <Text style={styles.syncBanner}>Movie Date</Text>
          <View style={styles.syncControls}>
            {isPaused ? (
              <Pressable style={styles.syncBtn} onPress={onSyncPlay}>
                <Ionicons name="play" size={16} color={colors.text} />
                <Text style={styles.syncBtnText}>Play both</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.syncBtn} onPress={onSyncPause}>
                <Ionicons name="pause" size={16} color={colors.text} />
                <Text style={styles.syncBtnText}>Pause both</Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : null}

      <View style={styles.playerArea}>
        {!isPaused ? (
          <PlayerWebView
            key={playerKey}
            embedUrl={embedUrl}
            onPlayerEvent={handlePlayerEvent}
            onCompleted={handleCompleted}
          />
        ) : (
          <View style={styles.pausedOverlay}>
            <Ionicons name="pause-circle" size={64} color={colors.text} />
            <Text style={styles.pausedTitle}>Paused</Text>
            <Text style={styles.pausedSub}>
              {partnerConnected
                ? 'Synced for both of you — tap Play both when ready'
                : 'Tap play in the player to continue'}
            </Text>
            {partnerConnected ? (
              <Pressable style={styles.resumeBtn} onPress={onSyncPlay}>
                <Ionicons name="play" size={20} color={colors.text} />
                <Text style={styles.resumeBtnText}>Play both</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      {partnerConnected ? <DateChatPanel /> : null}
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
  syncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  syncBanner: {
    ...typography.caption,
    color: colors.netflixRed,
    fontWeight: '700',
  },
  syncControls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.netflixRed,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 8,
  },
  syncBtnText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
  playerArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  pausedOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: '#000',
  },
  pausedTitle: {
    ...typography.title,
    color: colors.text,
  },
  pausedSub: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  resumeBtn: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.netflixRed,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  resumeBtnText: {
    ...typography.subtitle,
    color: colors.text,
  },
});
