export type ImdbSuggestionQid =
  | 'movie'
  | 'tvSeries'
  | 'tvMiniSeries'
  | 'tvMovie'
  | 'tvSpecial'
  | 'video'
  | 'short'
  | string;

export interface ImdbSuggestionImage {
  height: number;
  width: number;
  imageUrl: string;
}

export interface ImdbSuggestionItem {
  id: string;
  l: string;
  s?: string;
  q?: string;
  qid?: ImdbSuggestionQid;
  rank?: number;
  y?: number;
  yr?: string;
  i?: ImdbSuggestionImage;
}

export interface ImdbSuggestionResponse {
  d: ImdbSuggestionItem[];
  q: string;
  v: number;
}

export interface ImdbTitleResult {
  imdbId: string;
  title: string;
  subtitle?: string;
  year?: string;
  posterUrl?: string;
  mediaType: 'movie' | 'tv';
}
