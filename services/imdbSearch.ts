import type {
  ImdbSuggestionItem,
  ImdbSuggestionResponse,
  ImdbTitleResult,
} from '../types/imdb';

const IMDB_SUGGESTION_BASE = 'https://v3.sg.media-imdb.com/suggestion';
const searchCache = new Map<
  string,
  { results: ImdbTitleResult[]; expiresAt: number }
>();
const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;

const TV_QIDS = new Set([
  'tvSeries',
  'tvMiniSeries',
  'tvMovie',
  'tvSpecial',
  'tvShort',
]);

function isTitleResult(item: ImdbSuggestionItem): boolean {
  return /^tt\d+$/i.test(item.id);
}

function resolveMediaType(item: ImdbSuggestionItem): 'movie' | 'tv' {
  if (item.qid && TV_QIDS.has(item.qid)) return 'tv';
  if (item.q?.toLowerCase().includes('tv')) return 'tv';
  return 'movie';
}

function mapSuggestion(item: ImdbSuggestionItem): ImdbTitleResult {
  const year =
    item.yr ?? (item.y != null ? String(item.y) : undefined);
  const mediaType = resolveMediaType(item);
  const kindLabel = mediaType === 'tv' ? 'TV' : 'Movie';

  return {
    imdbId: item.id.toLowerCase(),
    title: item.l,
    subtitle: [kindLabel, year, item.s].filter(Boolean).join(' · '),
    year,
    posterUrl: item.i?.imageUrl,
    mediaType,
  };
}

function buildSearchUrl(query: string): string {
  const trimmed = query.trim().toLowerCase();
  const firstChar = trimmed[0];
  const encoded = encodeURIComponent(trimmed);

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    if (!isLocal) {
      return `/api/imdb-suggest?q=${encodeURIComponent(trimmed)}`;
    }
  }

  return `${IMDB_SUGGESTION_BASE}/${firstChar}/${encoded}.json?includeVideos=1`;
}

export async function searchImdbTitles(query: string): Promise<ImdbTitleResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const cacheKey = trimmed.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  const url = buildSearchUrl(cacheKey);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`IMDb search failed: ${response.status}`);
  }

  const data = (await response.json()) as ImdbSuggestionResponse;
  const results = (data.d ?? []).filter(isTitleResult).map(mapSuggestion);
  searchCache.set(cacheKey, {
    results,
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
  });
  return results;
}
