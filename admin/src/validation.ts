import type { ContentTypeDef, Doc } from './types';
import { GAMING_STATUSES } from './contentTypes';

const isAbsent = (v: unknown) => v === undefined || v === null;
const isLocalizedObject = (v: unknown) =>
  typeof v === 'object' && v !== null && !Array.isArray(v) &&
  Object.values(v as Record<string, unknown>).every((x) => x === null || typeof x === 'string');

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
      if (typeof titleId !== 'string' || titleId.trim() === '') {
        errors.push("Field 'titleId' is required.");
      }
      const r = doc.myRating;
      if (!isAbsent(r) && (typeof r !== 'number' || r < 0 || r > 10)) errors.push("Field 'myRating' must be between 0 and 10.");
      int('order');
      localized('review', false);
      break;
    }
    case 'gaming': {
      int('order');
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
