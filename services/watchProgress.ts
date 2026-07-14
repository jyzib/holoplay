import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlayerEvent, WatchProgressEntry } from '../types/vidapi';
import { getProgressKey } from './vidapi';

const STORAGE_KEY = '@holoplay_watch_progress';

export async function getAllProgress(): Promise<WatchProgressEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const entries: WatchProgressEntry[] = JSON.parse(raw);
    return entries.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function getProgress(id: string): Promise<WatchProgressEntry | null> {
  const all = await getAllProgress();
  return all.find((e) => e.id === id) ?? null;
}

export async function saveProgressFromEvent(event: PlayerEvent): Promise<void> {
  const { player_info, player_progress, player_duration, player_status } = event.data;
  if (player_status !== 'playing' && player_status !== 'paused' && player_status !== 'seeked') {
    return;
  }
  if (player_duration > 0 && player_progress / player_duration > 0.95) {
    await removeProgress(
      getProgressKey(
        player_info.imdb ?? undefined,
        player_info.tmdb ?? undefined,
        player_info.season ?? undefined,
        player_info.episode ?? undefined
      )
    );
    return;
  }

  const id = getProgressKey(
    player_info.imdb ?? undefined,
    player_info.tmdb ?? undefined,
    player_info.season ?? undefined,
    player_info.episode ?? undefined
  );

  const entry: WatchProgressEntry = {
    id,
    mediaType: player_info.mediaType,
    imdbId: player_info.imdb ?? undefined,
    tmdbId: player_info.tmdb ?? undefined,
    season: player_info.season ?? undefined,
    episode: player_info.episode ?? undefined,
    title: player_info.title ?? 'Unknown',
    poster: player_info.poster ?? undefined,
    progress: player_progress,
    duration: player_duration,
    updatedAt: Date.now(),
  };

  const all = await getAllProgress();
  const filtered = all.filter((e) => e.id !== id);
  filtered.unshift(entry);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, 50)));
}

export async function removeProgress(id: string): Promise<void> {
  const all = await getAllProgress();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(all.filter((e) => e.id !== id))
  );
}

export function formatProgress(progress: number, duration: number): string {
  const pct = duration > 0 ? Math.round((progress / duration) * 100) : 0;
  return `${pct}% watched`;
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
