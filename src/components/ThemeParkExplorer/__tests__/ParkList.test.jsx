import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ParkList from '../ParkList';

describe('ParkList', () => {
  const samplePark = {
    parkId: 'magic-kingdom',
    items: [
      { id: '1', name: { en: 'Space Mountain' }, category: 'attractions', order: 1 },
      { id: '2', name: { en: 'TRON Lightcycle Run' }, category: 'attractions', order: 10 },
      { id: '3', name: { en: 'Dole Whip' }, category: 'dining', order: 5 },
    ],
  };

  it('renders park items ordered by order field (descending for recent items)', () => {
    render(<ParkList park={samplePark} locale="en" />);
    // Since order is 10, 5, 1, TRON (order 10) comes first, then Dole Whip (5), then Space Mountain (1)
    const cardTitles = screen.getAllByRole('heading', { level: 4 }).map(h => h.textContent);
    expect(cardTitles[0]).toBe('TRON Lightcycle Run');
    expect(cardTitles[1]).toBe('Dole Whip');
    expect(cardTitles[2]).toBe('Space Mountain');
  });

  it('paginates park items when item count exceeds itemsPerPage', () => {
    const manyItemsPark = {
      parkId: 'epcot',
      items: Array.from({ length: 15 }, (_, i) => ({
        id: `item-${i + 1}`,
        name: { en: `Attraction ${i + 1}` },
        category: 'attractions',
        order: i + 1,
      })),
    };

    render(<ParkList park={manyItemsPark} locale="en" itemsPerPage={10} />);

    // Since items are sorted DESC (15 down to 1), page 1 shows Attraction 15 down to Attraction 6
    expect(screen.getByText('Attraction 15')).toBeInTheDocument();
    expect(screen.getByText('Attraction 6')).toBeInTheDocument();
    expect(screen.queryByText('Attraction 5')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
