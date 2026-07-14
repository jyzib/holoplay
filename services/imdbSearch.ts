import type {
  ImdbSuggestionItem,
  ImdbSuggestionResponse,
  ImdbTitleResult,
} from '../types/imdb';

const IMDB_SUGGESTION_BASE = 'https://v3.sg.media-imdb.com/suggestion';

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

export async function searchImdbTitles(query: string): Promise<ImdbTitleResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const firstChar = trimmed[0].toLowerCase();
  const encoded = encodeURIComponent(trimmed.toLowerCase());
  const url = `${IMDB_SUGGESTION_BASE}/${firstChar}/${encoded}.json?includeVideos=1`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`IMDb search failed: ${response.status}`);
  }

  const data = (await response.json()) as ImdbSuggestionResponse;
  return (data.d ?? []).filter(isTitleResult).map(mapSuggestion);
}
