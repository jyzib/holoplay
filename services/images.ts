const TMDB_SIZE_PATTERN = /\/t\/p\/(?:original|w\d+)\//;
const IMDB_VERSION_PATTERN = /\._V1_[^.]*(?=\.jpg|\.jpeg|\.png|\.webp)/i;

export function getPosterImageUrl(
  url: string | undefined,
  width = 342
): string | undefined {
  if (!url) return undefined;

  if (url.includes('image.tmdb.org')) {
    return url.replace(TMDB_SIZE_PATTERN, `/t/p/w${width}/`);
  }

  if (url.includes('m.media-amazon.com')) {
    const size = Math.max(width, 100);
    if (IMDB_VERSION_PATTERN.test(url)) {
      return url.replace(IMDB_VERSION_PATTERN, `._V1_SX${size}_`);
    }
  }

  return url;
}

export function getHeroImageUrl(url: string | undefined): string | undefined {
  return getPosterImageUrl(url, 780);
}
