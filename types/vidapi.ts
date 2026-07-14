export type MediaType = 'movie' | 'tv' | 'episode';

export interface PaginatedResponse<T> {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  items: T[];
}

export interface MovieItem {
  tmdb_id: string;
  imdb_id: string;
  title: string;
  year: string;
  poster_url: string;
  rating: string;
  genre: string;
  popularity: string;
  type: 'movie';
  embed_url: string;
}

export interface TvShowItem {
  tmdb_id: string;
  imdb_id: string;
  title: string;
  year: string;
  poster_url: string;
  rating: string;
  genre: string;
  popularity: string;
  type: 'tv';
  embed_url: string;
}

export interface EpisodeItem {
  show_tmdb_id: string;
  season_number: string;
  episode_number: string;
  episode_title: string;
  air_date: string;
  show_title: string;
  show_imdb_id: string;
  type: 'episode';
  embed_url: string;
}

export interface PlayerInfo {
  imdb: string | null;
  tmdb: string | null;
  mediaType: 'movie' | 'tv';
  season: number | null;
  episode: number | null;
  title: string | null;
  poster: string | null;
}

export type PlayerStatus = 'playing' | 'paused' | 'completed' | 'seeked';

export interface PlayerEventData {
  player_info: PlayerInfo;
  player_status: PlayerStatus;
  player_progress: number;
  player_duration: number;
  quality?: { label: string; width: number; height: number };
  availableQualities?: string[];
}

export interface PlayerEvent {
  type: 'PLAYER_EVENT';
  data: PlayerEventData;
}

export interface WatchProgressEntry {
  id: string;
  mediaType: 'movie' | 'tv';
  imdbId?: string;
  tmdbId?: string;
  season?: number;
  episode?: number;
  title: string;
  poster?: string;
  progress: number;
  duration: number;
  updatedAt: number;
}

export interface EmbedOptions {
  imdbId?: string;
  tmdbId?: string;
  season?: number;
  episode?: number;
  resumeAt?: number;
  autoplay?: boolean;
  title?: string;
  poster?: string;
  primaryColor?: string;
  lang?: string;
}
