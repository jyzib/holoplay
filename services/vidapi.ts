import type {
  EmbedOptions,
  EpisodeItem,
  MovieItem,
  PaginatedResponse,
  TvShowItem,
} from '../types/vidapi';

export const VIDAPI_BASE = 'https://vidapi.ru';
export const PLAYER_BASE = 'https://player.imdb.su';

const IMDB_PATTERN = /^tt\d{7,8}$/i;
const CACHE_TTL_MS = 5 * 60 * 1000;
const responseCache = new Map<
  string,
  { data: unknown; expiresAt: number }
>();
const pendingRequests = new Map<string, Promise<unknown>>();

export function isValidImdbId(id: string): boolean {
  return IMDB_PATTERN.test(id.trim());
}

export function normalizeImdbId(id: string): string {
  const trimmed = id.trim().toLowerCase();
  if (trimmed.startsWith('tt')) return trimmed;
  if (/^\d{7,8}$/.test(trimmed)) return `tt${trimmed}`;
  return trimmed;
}

export function buildEmbedUrl(
  mediaType: 'movie' | 'tv',
  options: EmbedOptions
): string {
  const id = options.imdbId ?? options.tmdbId;
  if (!id) throw new Error('IMDB or TMDB ID is required');

  let path: string;
  if (mediaType === 'movie') {
    path = `${PLAYER_BASE}/embed/movie/${id}`;
  } else {
    const season = options.season ?? 1;
    const episode = options.episode ?? 1;
    path = `${PLAYER_BASE}/embed/tv/${id}/${season}/${episode}`;
  }

  const params = new URLSearchParams();
  if (options.resumeAt && options.resumeAt > 0) {
    params.set('resumeAt', String(Math.floor(options.resumeAt)));
  }
  if (options.autoplay !== undefined) {
    params.set('autoplay', options.autoplay ? '1' : '0');
  }
  if (options.title) params.set('title', options.title);
  if (options.poster) params.set('poster', options.poster);
  if (options.primaryColor) params.set('primaryColor', options.primaryColor);
  if (options.lang) params.set('lang', options.lang);

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

async function fetchJson<T>(path: string): Promise<T> {
  const cached = responseCache.get(path);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }

  const pending = pendingRequests.get(path);
  if (pending) return pending as Promise<T>;

  const request = fetch(`${VIDAPI_BASE}${path}`)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`VidAPI error: ${response.status}`);
      }

      const data = (await response.json()) as T;
      responseCache.set(path, {
        data,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return data;
    })
    .finally(() => {
      pendingRequests.delete(path);
    });

  pendingRequests.set(path, request);
  return request;
}

export function fetchLatestMovies(page = 1): Promise<PaginatedResponse<MovieItem>> {
  return fetchJson(`/movies/latest/page-${page}.json`);
}

export function fetchLatestTvShows(page = 1): Promise<PaginatedResponse<TvShowItem>> {
  return fetchJson(`/tvshows/latest/page-${page}.json`);
}

export function fetchLatestEpisodes(page = 1): Promise<PaginatedResponse<EpisodeItem>> {
  return fetchJson(`/episodes/latest/page-${page}.json`);
}

export function getProgressKey(
  imdbId?: string,
  tmdbId?: string,
  season?: number,
  episode?: number
): string {
  const base = imdbId ?? tmdbId ?? 'unknown';
  if (season != null && episode != null) {
    return `${base}_s${season}e${episode}`;
  }
  return base;
}
