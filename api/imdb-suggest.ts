import type { VercelRequest, VercelResponse } from '@vercel/node';

const IMDB_SUGGESTION_BASE = 'https://v3.sg.media-imdb.com/suggestion';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const trimmed = q.trim().toLowerCase();

  if (trimmed.length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  const firstChar = trimmed[0];
  const encoded = encodeURIComponent(trimmed);
  const url = `${IMDB_SUGGESTION_BASE}/${firstChar}/${encoded}.json?includeVideos=1`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Holoplay/1.0)',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'IMDb search failed' });
    }

    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json(data);
  } catch {
    return res.status(500).json({ error: 'IMDb search failed' });
  }
}
