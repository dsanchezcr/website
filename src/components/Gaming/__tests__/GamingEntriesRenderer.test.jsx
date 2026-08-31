import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import GamingEntriesRenderer from '../GamingEntriesRenderer';

vi.mock('@docusaurus/useDocusaurusContext', () => ({
  default: () => ({
    i18n: {
      currentLocale: 'es',
    },
  }),
}));

describe('GamingEntriesRenderer', () => {
  it('renders card entries', () => {
    render(
      <GamingEntriesRenderer
        items={[
          {
            type: 'card',
            title: 'Halo Infinite',
            platform: 'xbox',
            status: 'completed',
            imageUrl: 'https://dsanchezcrwebsite.blob.core.windows.net/images/gaming/xbox/halo-infinite.jpg',
          },
        ]}
      />
    );

    expect(screen.getByText('Halo Infinite')).toBeInTheDocument();
    expect(screen.getByText('Xbox')).toBeInTheDocument();
  });

  it('renders group entries with child games', () => {
    render(
      <GamingEntriesRenderer
        items={[
          {
            type: 'group',
            title: 'Little Nightmares Series',
            platform: 'xbox',
            status: 'completed',
            games: [
              {
                title: 'Little Nightmares',
                platform: 'xbox',
                status: 'completed',
                imageUrl: 'https://dsanchezcrwebsite.blob.core.windows.net/images/gaming/xbox/little-nightmares.jpg',
              },
              {
                title: 'Little Nightmares II',
                platform: 'xbox',
                status: 'completed',
                imageUrl: 'https://dsanchezcrwebsite.blob.core.windows.net/images/gaming/xbox/little-nightmares-2.jpg',
              },
            ],
          },
        ]}
      />
    );

    expect(screen.getByText('Little Nightmares Series')).toBeInTheDocument();
    expect(screen.getByText('Little Nightmares')).toBeInTheDocument();
    expect(screen.getByText('Little Nightmares II')).toBeInTheDocument();
  });

  it('ignores invalid entries safely', () => {
    render(
      <GamingEntriesRenderer
        items={[
          null,
          'invalid',
          {
            type: 'card',
            title: 'Cuphead',
            platform: 'xbox',
            status: 'completed',
            imageUrl: 'https://dsanchezcrwebsite.blob.core.windows.net/images/gaming/xbox/cuphead.jpg',
          },
        ]}
      />
    );

    expect(screen.getByText('Cuphead')).toBeInTheDocument();
  });

  it('renders nothing when items is empty or invalid', () => {
    const { container, rerender } = render(<GamingEntriesRenderer items={[]} />);
    expect(container).toBeEmptyDOMElement();

    rerender(<GamingEntriesRenderer items={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders localized recommendation and group title for selected locale', () => {
    render(
      <GamingEntriesRenderer
        items={[
          {
            type: 'group',
            title: { en: 'Little Nightmares Series', es: 'Serie Little Nightmares' },
            platform: 'xbox',
            recommendation: { en: 'English text', es: 'Texto en espanol' },
            games: [
              {
                title: { en: 'Little Nightmares', es: 'Little Nightmares' },
                platform: 'xbox',
                imageUrl: 'https://dsanchezcrwebsite.blob.core.windows.net/images/gaming/xbox/little-nightmares.jpg',
                recommendation: { en: 'English game note', es: 'Nota en espanol' },
              },
            ],
          },
        ]}
      />
    );

    expect(screen.getByText('Serie Little Nightmares')).toBeInTheDocument();
    expect(screen.getByText(/Texto en espanol/i)).toBeInTheDocument();
  });

  it('orders items descending by default (recent items first)', () => {
    render(
      <GamingEntriesRenderer
        items={[
          { type: 'card', title: 'Old Game', order: 1 },
          { type: 'card', title: 'New Game', order: 5 },
        ]}
      />
    );

    const titles = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
    expect(titles[0]).toBe('New Game');
    expect(titles[1]).toBe('Old Game');
  });

  it('orders topGames section ascending (rank 1 first)', () => {
    render(
      <GamingEntriesRenderer
        section="topGames"
        items={[
          { type: 'card', title: 'Rank 2 Game', order: 2 },
          { type: 'card', title: 'Rank 1 Game', order: 1 },
        ]}
      />
    );

    const titles = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
    expect(titles[0]).toBe('Rank 1 Game');
    expect(titles[1]).toBe('Rank 2 Game');
  });

  it('paginates items when count exceeds itemsPerPage', () => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      type: 'card',
      title: `Game ${i + 1}`,
      order: i + 1,
    }));

    render(<GamingEntriesRenderer items={items} itemsPerPage={10} />);

    // Since items are sorted descending, Page 1 has Game 15 down to Game 6
    expect(screen.getByText('Game 15')).toBeInTheDocument();
    expect(screen.getByText('Game 6')).toBeInTheDocument();
    expect(screen.queryByText('Game 5')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
