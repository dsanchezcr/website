import type { Doc } from './types';

export interface OmdbMetadata {
  titleId: string;
  title: string;
  year: number | null;
  plot: string | null;
  director: string | null;
  type: 'movie' | 'series';
  imageUrl: string | null;
  imdbRating: number | null;
  genres: string[];
}

/** Only locally authored messages may reach the lookup UI. */
export class OmdbLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OmdbLookupError';
  }
}

export function normalizeImdbId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  // Check the entire match explicitly: JS $ alone also accepts a final newline.
  return /^tt[0-9]{6,12}$/.exec(trimmed)?.[0] === trimmed ? trimmed : null;
}

const availableText = (value: string | null): string | null => {
  const text = value?.trim();
  return text && text.toUpperCase() !== 'N/A' ? text : null;
};

/** Validate the server contract before any part of the form can be changed. */
export function parseOmdbMetadata(value: unknown, requestedId: string): OmdbMetadata {
  const invalid = () => new OmdbLookupError('Invalid metadata response. Please try again.');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const data = value as Record<string, unknown>;
  if (data.titleId !== requestedId || normalizeImdbId(data.titleId) !== requestedId ||
      typeof data.title !== 'string' || !availableText(data.title) ||
      (data.type !== 'movie' && data.type !== 'series') ||
      !(data.year === null || (typeof data.year === 'number' && Number.isSafeInteger(data.year) &&
        data.year >= 1 && data.year <= 9999)) ||
      !['plot', 'director', 'imageUrl'].every(key => data[key] === null || typeof data[key] === 'string') ||
      !(data.imdbRating === null || (typeof data.imdbRating === 'number' &&
        Number.isFinite(data.imdbRating) && data.imdbRating >= 0 && data.imdbRating <= 10)) ||
      !Array.isArray(data.genres) || !data.genres.every(genre => typeof genre === 'string')) {
    throw invalid();
  }
  const imageUrl = availableText(data.imageUrl as string | null);
  if (imageUrl) {
    try {
      const url = new URL(imageUrl);
      if (!/^https?:\/\//i.test(imageUrl) || !['https:', 'http:'].includes(url.protocol) ||
          url.username || url.password || /[\s<>"'`\\]/.test(imageUrl)) throw invalid();
    } catch {
      throw invalid();
    }
  }
  // Select only contract fields; never return arbitrary provider/response properties.
  return {
    titleId: requestedId,
    title: availableText(data.title)!,
    year: data.year as number | null,
    plot: availableText(data.plot as string | null),
    director: availableText(data.director as string | null),
    type: data.type,
    imageUrl,
    imdbRating: data.imdbRating as number | null,
    genres: (data.genres as string[]).map(availableText).filter((genre): genre is string => genre !== null),
  };
}

/** Update English metadata only. Curated fields, translations and legacy TMDB values survive. */
export function mergeOmdbMetadata(doc: Doc, metadata: OmdbMetadata): Doc {
  const next: Doc = {
    ...doc,
    titleId: metadata.titleId,
    mediaType: metadata.type === 'movie' ? 'movie' : 'tv',
    // Prefer the fetched IMDb link/rating without deleting legacy TMDB metadata or attribution.
    metadataSource: 'omdb',
  };
  for (const key of ['title', 'year', 'plot', 'director', 'imageUrl', 'imdbRating'] as const) {
    const value = metadata[key];
    if (value !== null && (typeof value !== 'string' || availableText(value))) next[key] = value;
  }
  if (metadata.genres.length > 0) next.genres = [...metadata.genres];
  for (const [key, text] of [['titleTranslations', metadata.title], ['overview', metadata.plot]] as const) {
    const existing = doc[key];
    if (text && availableText(text) && existing && typeof existing === 'object' && !Array.isArray(existing) &&
        Object.prototype.hasOwnProperty.call(existing, 'en')) {
      next[key] = { ...existing, en: text };
    }
  }
  return next;
}
