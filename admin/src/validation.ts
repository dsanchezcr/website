import type { ContentTypeDef, Doc } from './types';
import { GAMING_STATUSES } from './contentTypes';

const isAbsent = (v: unknown) => v === undefined || v === null;
const isLocalizedObject = (v: unknown) =>
  typeof v === 'object' && v !== null && !Array.isArray(v) &&
  Object.values(v as Record<string, unknown>).every((x) => x === null || typeof x === 'string');
export const isIpLiteral = (hostname: string) =>
  /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || /^\d+(?:\.\d+)*$/.test(hostname) ||
  hostname.startsWith('[') || hostname.includes(':');
export const isExternalHttpsUrl = (value: string) => {
  if (value.length === 0) return true;
  if (!value.trim()) return false;
  try {
    const url = new URL(value);
    return value.length <= 4096 && !/[\s<>"'`\\]/.test(value) && /^https:\/\//i.test(value) &&
      url.protocol === 'https:' && !url.username && !url.password &&
      url.hostname.includes('.') && !url.hostname.toLowerCase().endsWith('.local') &&
      !url.hostname.toLowerCase().endsWith('.localhost') && !/^localhost$/i.test(url.hostname) &&
      !isIpLiteral(url.hostname);
  } catch {
    return false;
  }
};

/**
 * Client-side mirror of the server ContentValidator. Used for fast feedback before saving; the
 * server remains the source of truth.
 */
export function validate(type: ContentTypeDef, doc: Doc): string[] {
  const errors: string[] = [];
  const pkField = type.partitionKeyField;
  const pkValue = doc[pkField];
  if (typeof pkValue !== 'string' || pkValue.trim() === '') {
    errors.push(`Field '${pkField}' (partition key) is required and must be a non-empty string.`);
  }

  const num = (key: string) => {
    const v = doc[key];
    if (isAbsent(v)) return;
    if (typeof v !== 'number' || Number.isNaN(v)) errors.push(`Field '${key}' must be a number.`);
  };
  const int = (key: string) => {
    const v = doc[key];
    if (isAbsent(v)) return;
    if (typeof v !== 'number' || !Number.isInteger(v)) errors.push(`Field '${key}' must be an integer.`);
  };
  const localized = (key: string, allowString: boolean) => {
    const v = doc[key];
    if (isAbsent(v)) return;
    if (typeof v === 'string') {
      if (!allowString) errors.push(`Field '${key}' must be a localized object with en/es/pt string values.`);
      return;
    }
    if (!isLocalizedObject(v)) {
      errors.push(allowString
        ? `Field '${key}' must be a string or a localized object.`
        : `Field '${key}' must be a localized object with en/es/pt string values.`);
    }
  };

  switch (type.slug) {
    case 'movies':
    case 'series': {
      const titleId = doc.titleId;
      const hasTmdbId = !isAbsent(doc.tmdbId);
      if (!hasTmdbId && (typeof titleId !== 'string' || titleId.trim() === '')) {
        errors.push("Field 'titleId' is required.");
      }
      for (const field of ['titleId', 'title', 'plot', 'director', 'imageUrl', 'syncSource']) {
        if (!isAbsent(doc[field]) && typeof doc[field] !== 'string') errors.push(`Field '${field}' must be a string.`);
      }
      if (typeof doc.imageUrl === 'string' && !isExternalHttpsUrl(doc.imageUrl)) {
        errors.push("Field 'imageUrl' must be an absolute external HTTPS URL.");
      }
      int('tmdbId');
      if (hasTmdbId && (typeof doc.tmdbId !== 'number' || doc.tmdbId < 1 || doc.tmdbId > 2147483647)) {
        errors.push("Field 'tmdbId' must be between 1 and 2147483647.");
      }
      const expectedMediaType = type.slug === 'movies' ? 'movie' : 'tv';
      if ((hasTmdbId || !isAbsent(doc.mediaType)) && doc.mediaType !== expectedMediaType) {
        errors.push(`Field 'mediaType' must be '${expectedMediaType}' for this container.`);
      }
      if (!isAbsent(doc.posterPath) && (typeof doc.posterPath !== 'string' || !/^\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(doc.posterPath))) {
        errors.push("Field 'posterPath' must be a TMDB image path, not a URL.");
      }
      for (const field of ['titleTranslations', 'overview']) {
        localized(field, false);
        const value = doc[field];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const translations = value as Record<string, unknown>;
          for (const locale of ['en', 'es', 'pt']) {
            if (typeof translations[locale] !== 'string') errors.push(`Field '${field}.${locale}' must be a string.`);
          }
        }
      }
      if (!isAbsent(doc.genresTranslations)) {
        const translations = doc.genresTranslations;
        if (!translations || typeof translations !== 'object' || Array.isArray(translations)) {
          errors.push("Field 'genresTranslations' must be an en/es/pt object of string arrays.");
        } else {
          for (const locale of ['en', 'es', 'pt']) {
            const value = (translations as Record<string, unknown>)[locale];
            if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
              errors.push(`Field 'genresTranslations.${locale}' must be an array of strings.`);
            }
          }
        }
      }
      const r = doc.myRating;
      for (const field of ['myRating', 'imdbRating', 'tmdbRating']) {
        const rating = doc[field];
        if (!isAbsent(rating) && (typeof rating !== 'number' || !Number.isFinite(rating) || rating < 0 || rating > 10)) {
          errors.push(`Field '${field}' must be between 0 and 10.`);
        }
      }
      if (hasTmdbId && typeof r === 'number' && (r < 0.5 || !Number.isInteger(r * 2))) {
        errors.push("TMDB 'myRating' must be 0.5–10 in half-point increments, or null for unrated.");
      }
      if (!isAbsent(doc.syncedAt) && (typeof doc.syncedAt !== 'string' || !Number.isFinite(Date.parse(doc.syncedAt)))) {
        errors.push("Field 'syncedAt' must be an ISO-8601 timestamp.");
      }
      int('order');
      int('year');
      const genres = doc.genres;
      if (!isAbsent(genres) && (!Array.isArray(genres) || genres.some((g) => typeof g !== 'string'))) {
        errors.push("Field 'genres' must be an array of strings.");
      }
      localized('review', false);
      break;
    }
    case 'gaming': {
      int('order');
      int('manualOrder');
      const rank = doc.manualOrder;
      if (!isAbsent(rank) && (typeof rank !== 'number' || rank < 1 || rank > 2147483646)) {
        errors.push("Field 'manualOrder' must be between 1 and 2147483646.");
      }
      if (!isAbsent(doc.createdAt) && (typeof doc.createdAt !== 'string' || !Number.isFinite(Date.parse(doc.createdAt)))) {
        errors.push("Field 'createdAt' must be an ISO-8601 timestamp.");
      }
      const s = doc.status;
      if (!isAbsent(s) && (typeof s !== 'string' || !GAMING_STATUSES.includes(s.toLowerCase()))) {
        errors.push("Field 'status' must be one of: completed, playing, backlog, dropped.");
      }
      localized('title', true);
      localized('description', true);
      localized('recommendation', true);
      ['coOp', 'online'].forEach((k) => { if (!isAbsent(doc[k]) && typeof doc[k] !== 'boolean') errors.push(`Field '${k}' must be a boolean.`); });
      break;
    }
    case 'parks': {
      localized('name', false);
      localized('description', false);
      const mc = doc.mapCenter;
      if (!isAbsent(mc) && (!Array.isArray(mc) || mc.length !== 2 || mc.some((n) => typeof n !== 'number'))) {
        errors.push("Field 'mapCenter' must be an array of 2 numbers.");
      }
      num('mapZoom');
      break;
    }
    case 'monthly-updates': {
      int('order');
      if (typeof pkValue === 'string' && pkValue.trim() !== '' && !/^\d{4}-\d{2}$/.test(pkValue)) {
        errors.push("Field 'month' must be in 'YYYY-MM' format.");
      }
      break;
    }
  }

  return errors;
}
