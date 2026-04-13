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
            imageUrl: '/img/gaming/xbox/halo-infinite.jpg',
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
                imageUrl: '/img/gaming/xbox/little-nightmares.jpg',
              },
              {
                title: 'Little Nightmares II',
                platform: 'xbox',
                status: 'completed',
                imageUrl: '/img/gaming/xbox/little-nightmares-2.jpg',
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
            imageUrl: '/img/gaming/xbox/cuphead.jpg',
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
                imageUrl: '/img/gaming/xbox/little-nightmares.jpg',
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
});
