import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useDateSync } from '../context/DateSyncContext';

function mediaKey(media: {
  type: string;
  imdbId?: string;
  tmdbId?: string;
  season?: number;
  episode?: number;
} | null): string {
  if (!media) return '';
  return [
    media.type,
    media.imdbId ?? '',
    media.tmdbId ?? '',
    media.season ?? '',
    media.episode ?? '',
  ].join(':');
}

/**
 * When a paired partner starts (or switches) a title, open the player
 * even if this device is still on Home / Search / details.
 * Pause/seek while already watching is handled inside the player screen.
 */
export function DateSyncNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  const { partnerConnected, syncState, remoteRevision } = useDateSync();
  const lastMediaKey = useRef('');

  useEffect(() => {
    if (!partnerConnected || remoteRevision === 0) return;
    const media = syncState.media;
    if (!media) return;

    const key = mediaKey(media);
    if (!key || key === lastMediaKey.current) return;
    lastMediaKey.current = key;

    if (pathname?.includes('player')) return;

    router.push({
      pathname: '/player',
      params: {
        type: media.type,
        imdbId: media.imdbId,
        tmdbId: media.tmdbId,
        season: media.season != null ? String(media.season) : undefined,
        episode: media.episode != null ? String(media.episode) : undefined,
        title: media.title,
        poster: media.poster,
        resumeAt: String(Math.floor(syncState.progress)),
      },
    });
  }, [
    partnerConnected,
    remoteRevision,
    syncState.media,
    syncState.progress,
    pathname,
    router,
  ]);

  return null;
}
