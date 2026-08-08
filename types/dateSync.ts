export type DateSyncStatus = 'playing' | 'paused';

export interface DateSyncMedia {
  type: 'movie' | 'tv';
  imdbId?: string;
  tmdbId?: string;
  season?: number;
  episode?: number;
  title?: string;
  poster?: string;
}

export interface DateSyncState {
  media: DateSyncMedia | null;
  status: DateSyncStatus;
  progress: number;
  updatedAt: number;
  seq: number;
}

export type DateSyncMessage =
  | { kind: 'hello'; clientId: string; name?: string }
  | { kind: 'ping'; clientId: string }
  | { kind: 'state'; clientId: string; state: DateSyncState };

export type DateConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'waiting'
  | 'paired'
  | 'error';
