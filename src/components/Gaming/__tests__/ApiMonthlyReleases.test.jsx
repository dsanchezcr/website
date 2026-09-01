import { describe, it, expect } from 'vitest';
import { sortByReleaseDateAscending } from '../ApiMonthlyReleases';

describe('sortByReleaseDateAscending', () => {
  it('orders upcoming releases ascending by release date (soonest first)', () => {
    const items = [
      { id: 'c', releaseDate: 'August 28', order: 1 },
      { id: 'a', releaseDate: 'August 5', order: 3 },
      { id: 'b', releaseDate: 'August 12', order: 2 },
    ];
    const sorted = sortByReleaseDateAscending(items, '2026-08');
    expect(sorted.map(i => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('reproduces the reported bug scenario for August/September 2026', () => {
    const august = [
      { id: 'aug-late', releaseDate: 'August 25', order: 1 },
      { id: 'aug-early', releaseDate: 'August 4', order: 5 },
      { id: 'aug-mid', releaseDate: 'August 14', order: 3 },
    ];
    const september = [
      { id: 'sep-late', releaseDate: 'September 30', order: 2 },
      { id: 'sep-early', releaseDate: 'September 2', order: 4 },
    ];

    expect(sortByReleaseDateAscending(august, '2026-08').map(i => i.id)).toEqual([
      'aug-early', 'aug-mid', 'aug-late',
    ]);
    expect(sortByReleaseDateAscending(september, '2026-09').map(i => i.id)).toEqual([
      'sep-early', 'sep-late',
    ]);
  });

  it('places unparsable release dates at the end, keeping curated order as tiebreaker', () => {
    const items = [
      { id: 'tba', releaseDate: 'TBA', order: 9 },
      { id: 'a', releaseDate: 'August 5', order: 1 },
      { id: 'unset', order: 5 },
    ];
    const sorted = sortByReleaseDateAscending(items, '2026-08');
    expect(sorted[0].id).toBe('a');
    expect(sorted.slice(1).map(i => i.id).sort()).toEqual(['tba', 'unset']);
  });

  it('handles day-only release date strings using the month prop', () => {
    const items = [
      { id: 'late', releaseDate: '20', order: 1 },
      { id: 'early', releaseDate: '3', order: 2 },
    ];
    const sorted = sortByReleaseDateAscending(items, '2026-09');
    expect(sorted.map(i => i.id)).toEqual(['early', 'late']);
  });

  it('does not mutate the original array', () => {
    const items = [
      { id: 'b', releaseDate: 'August 12', order: 1 },
      { id: 'a', releaseDate: 'August 1', order: 2 },
    ];
    const original = [...items];
    sortByReleaseDateAscending(items, '2026-08');
    expect(items).toEqual(original);
  });
});
