import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const movies = JSON.parse(readFileSync(resolve(__dirname, '../movies.json'), 'utf-8'));
const series = JSON.parse(readFileSync(resolve(__dirname, '../series.json'), 'utf-8'));

describe('movies.json schema validation', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(movies)).toBe(true);
    expect(movies.length).toBeGreaterThan(0);
  });

  it('every entry has a titleId starting with "tt"', () => {
    for (const movie of movies) {
      expect(movie.titleId, `Entry missing titleId`).toBeTruthy();
      expect(movie.titleId).toMatch(/^tt\d+$/);
    }
  });

  it('every entry has a valid category', () => {
    const validCategories = ['recently-watched', 'top-movies', 'watchlist'];
    for (const movie of movies) {
      expect(
        validCategories,
        `Invalid category "${movie.category}" for ${movie.titleId}`
      ).toContain(movie.category);
    }
  });

  it('rated entries have myRating between 1 and 10', () => {
    const rated = movies.filter((m) => m.myRating != null);
    expect(rated.length).toBeGreaterThan(0);
    for (const movie of rated) {
      expect(movie.myRating).toBeGreaterThanOrEqual(1);
      expect(movie.myRating).toBeLessThanOrEqual(10);
    }
  });

  it('every entry has a review object with en, es, pt keys', () => {
    for (const movie of movies) {
      expect(movie.review, `Missing review for ${movie.titleId}`).toBeDefined();
      expect(typeof movie.review).toBe('object');
      expect(movie.review).toHaveProperty('en');
      expect(movie.review).toHaveProperty('es');
      expect(movie.review).toHaveProperty('pt');
    }
  });

  it('no duplicate titleIds', () => {
    const ids = movies.map((m) => m.titleId);
    const unique = new Set(ids);
    expect(ids.length).toBe(unique.size);
  });
});

describe('series.json schema validation', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(series)).toBe(true);
    expect(series.length).toBeGreaterThan(0);
  });

  it('every entry has a titleId starting with "tt"', () => {
    for (const show of series) {
      expect(show.titleId).toBeTruthy();
      expect(show.titleId).toMatch(/^tt\d+$/);
    }
  });

  it('every entry has a valid category', () => {
    const validCategories = ['currently-watching', 'completed', 'watchlist'];
    for (const show of series) {
      expect(
        validCategories,
        `Invalid category "${show.category}" for ${show.titleId}`
      ).toContain(show.category);
    }
  });

  it('every entry has a review object with en, es, pt keys', () => {
    for (const show of series) {
      expect(show.review, `Missing review for ${show.titleId}`).toBeDefined();
      expect(typeof show.review).toBe('object');
      expect(show.review).toHaveProperty('en');
      expect(show.review).toHaveProperty('es');
      expect(show.review).toHaveProperty('pt');
    }
  });

  it('no duplicate titleIds', () => {
    const ids = series.map((s) => s.titleId);
    const unique = new Set(ids);
    expect(ids.length).toBe(unique.size);
  });
});
