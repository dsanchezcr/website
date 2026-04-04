import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import MediaCardList from '../MediaCardList';

// Passthrough mock: return items enriched with minimal imdb data so MediaCard renders
vi.mock('@site/src/hooks/useImdbData', () => ({
  useImdbData: (items) =>
    items.map(item => ({
      ...item,
      imdb: {
        primaryTitle: item.titleId,
        primaryImage: { url: '' },
        rating: { aggregateRating: 8.0 },
        startYear: 2020,
        genres: ['Drama'],
      },
      loading: false,
      error: null,
    })),
}));

describe('MediaCardList', () => {
  const makeItem = (titleId, order) => ({
    titleId,
    myRating: 8,
    review: { en: 'Good.', es: 'Bueno.', pt: 'Bom.' },
    category: 'recently-watched',
    ...(order !== undefined && { order }),
  });

  it('renders nothing message when items list is empty', () => {
    render(<MediaCardList items={[]} />);
    expect(screen.getByText('No titles to display yet.')).toBeInTheDocument();
  });

  it('renders nothing message when all items are filtered out by category', () => {
    const items = [makeItem('tt0000001', 1)];
    render(<MediaCardList items={items} category="other-category" />);
    expect(screen.getByText('No titles to display yet.')).toBeInTheDocument();
  });

  it('renders items sorted by order field (ascending)', () => {
    const items = [
      makeItem('tt0000003', 3),
      makeItem('tt0000001', 1),
      makeItem('tt0000002', 2),
    ];
    render(<MediaCardList items={items} />);
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', 'https://www.imdb.com/title/tt0000001/');
    expect(links[1]).toHaveAttribute('href', 'https://www.imdb.com/title/tt0000002/');
    expect(links[2]).toHaveAttribute('href', 'https://www.imdb.com/title/tt0000003/');
  });

  it('renders items without order after items with order', () => {
    const items = [
      makeItem('tt0000099'),       // no order
      makeItem('tt0000001', 1),
      makeItem('tt0000098'),       // no order
      makeItem('tt0000002', 2),
    ];
    render(<MediaCardList items={items} />);
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', 'https://www.imdb.com/title/tt0000001/');
    expect(links[1]).toHaveAttribute('href', 'https://www.imdb.com/title/tt0000002/');
    // Items without order come last (original relative order preserved via stable sort)
    const lastHrefs = [links[2], links[3]].map(l => l.getAttribute('href'));
    expect(lastHrefs).toContain('https://www.imdb.com/title/tt0000099/');
    expect(lastHrefs).toContain('https://www.imdb.com/title/tt0000098/');
  });

  it('filters by category before sorting', () => {
    const items = [
      { ...makeItem('tt0000002', 2), category: 'recently-watched' },
      { ...makeItem('tt0000001', 1), category: 'watchlist' },
      { ...makeItem('tt0000003', 3), category: 'recently-watched' },
    ];
    render(<MediaCardList items={items} category="recently-watched" />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://www.imdb.com/title/tt0000002/');
    expect(links[1]).toHaveAttribute('href', 'https://www.imdb.com/title/tt0000003/');
  });

  it('renders all items when no category filter is applied', () => {
    const items = [
      { ...makeItem('tt0000002', 2), category: 'recently-watched' },
      { ...makeItem('tt0000001', 1), category: 'watchlist' },
    ];
    render(<MediaCardList items={items} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://www.imdb.com/title/tt0000001/');
    expect(links[1]).toHaveAttribute('href', 'https://www.imdb.com/title/tt0000002/');
  });
});
