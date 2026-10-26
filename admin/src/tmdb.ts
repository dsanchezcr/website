import type { Doc } from './types';

export type MediaType = 'movie' | 'tv';
type Locale = 'en' | 'es' | 'pt';
type Translations<T> = Record<Locale, T>;
const locales: Locale[] = ['en', 'es', 'pt'];

export interface TmdbMetadata {
  tmdbId: number;
  mediaType: MediaType;
  titleId: string | null;
  title: string;
  year: number | null;
  plot: string | null;
  director: string | null;
  posterPath: string | null;
  imageUrl: string | null;
  tmdbRating: number | null;
  genres: string[];
  titleTranslations: Translations<string>;
  overview: Translations<string>;
  genresTranslations: Translations<string[]>;
}

export class TmdbLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TmdbLookupError';
  }
}

export function normalizeTmdbId(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  if (!/^[1-9][0-9]{0,9}$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const text = (value: unknown): value is string => typeof value === 'string';
const stringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(text);
const available = (value: unknown): value is string => text(value) && value.trim().length > 0;
const invalid = () => new TmdbLookupError('Invalid metadata response. Please try again.');

function translations<T>(value: unknown, valid: (entry: unknown) => entry is T): Translations<T> {
  const data = record(value);
  if (!data || !valid(data.en) || !valid(data.es) || !valid(data.pt)) throw invalid();
  return { en: data.en, es: data.es, pt: data.pt };
}

export function parseTmdbMetadata(value: unknown, requestedId: number, mediaType: MediaType): TmdbMetadata {
  const data = record(value);
  if (!data || data.tmdbId !== requestedId || data.mediaType !== mediaType ||
      !available(data.title) ||
      !(data.titleId === null || (text(data.titleId) && /^tt[0-9]{6,12}$/.exec(data.titleId)?.[0] === data.titleId)) ||
      !(data.year === null || (typeof data.year === 'number' && Number.isInteger(data.year) && data.year >= 1 && data.year <= 9999)) ||
      !(data.plot === null || text(data.plot)) || !(data.director === null || text(data.director)) ||
      !(data.posterPath === null || (text(data.posterPath) &&
        /^\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.exec(data.posterPath)?.[0] === data.posterPath)) ||
      data.imageUrl !== (data.posterPath === null ? null : `https://image.tmdb.org/t/p/w500${data.posterPath}`) ||
      !(data.tmdbRating === null || (typeof data.tmdbRating === 'number' &&
        Number.isFinite(data.tmdbRating) && data.tmdbRating >= 0 && data.tmdbRating <= 10)) ||
      !stringArray(data.genres)) throw invalid();
  return {
    tmdbId: requestedId, mediaType, titleId: data.titleId, title: data.title.trim(),
    year: data.year, plot: data.plot?.trim() || null, director: data.director?.trim() || null,
    posterPath: data.posterPath, imageUrl: data.posterPath === null ? null : `https://image.tmdb.org/t/p/w500${data.posterPath}`,
    tmdbRating: data.tmdbRating, genres: [...data.genres],
    titleTranslations: translations(data.titleTranslations, text),
    overview: translations(data.overview, text),
    genresTranslations: translations(data.genresTranslations, stringArray),
  };
}

/** Refresh provider metadata without overwriting curation or existing non-English translations. */
export function mergeTmdbMetadata(doc: Doc, metadata: TmdbMetadata): Doc {
  const next: Doc = {
    ...doc, tmdbId: metadata.tmdbId, mediaType: metadata.mediaType,
    titleId: metadata.titleId, metadataSource: 'tmdb', tmdbRating: metadata.tmdbRating,
  };
  for (const key of ['title', 'year', 'plot', 'director', 'imageUrl', 'posterPath'] as const) {
    const value = metadata[key];
    if (value !== null && (typeof value !== 'string' || available(value))) next[key] = value;
  }
  if (metadata.genres.length > 0) next.genres = [...metadata.genres];
  for (const key of ['titleTranslations', 'overview'] as const) {
    const existing = record(doc[key]) || {};
    const merged = { ...existing };
    for (const locale of locales) {
      const incoming = metadata[key][locale];
      merged[locale] = locale !== 'en' && available(existing[locale])
        ? existing[locale] : incoming || existing[locale] || '';
    }
    next[key] = merged;
  }
  const existingGenres = record(doc.genresTranslations) || {};
  const mergedGenres = { ...existingGenres };
  for (const locale of locales) {
    const existing = existingGenres[locale];
    mergedGenres[locale] = stringArray(existing) && existing.length > 0 &&
      (locale !== 'en' || metadata.genresTranslations[locale].length === 0)
      ? [...existing] : [...metadata.genresTranslations[locale]];
  }
  next.genresTranslations = mergedGenres;
  return next;
}
