import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import MediaCard from '../MediaCard';

describe('MediaCard', () => {
  const defaultProps = {
    titleId: 'tt0111161',
    myRating: 10,
    review: {
      en: 'A timeless masterpiece.',
      es: 'Una obra maestra atemporal.',
      pt: 'Uma obra-prima atemporal.',
    },
    imdb: {
      primaryTitle: 'The Shawshank Redemption',
      primaryImage: { url: 'https://imdb.com/poster.jpg' },
      rating: { aggregateRating: 9.3 },
      startYear: 1994,
      genres: ['Drama'],
    },
    locale: 'en',
  };

  it('renders the movie title with year', () => {
    render(<MediaCard {...defaultProps} />);
    expect(screen.getByText('The Shawshank Redemption (1994)')).toBeInTheDocument();
  });

  it('renders the IMDb rating', () => {
    render(<MediaCard {...defaultProps} />);
    expect(screen.getByText('⭐ 9.3')).toBeInTheDocument();
  });

  it('renders personal rating', () => {
    render(<MediaCard {...defaultProps} />);
    expect(screen.getByText('My: 10/10')).toBeInTheDocument();
  });

  it('renders localized review in English', () => {
    render(<MediaCard {...defaultProps} locale="en" />);
    expect(screen.getByText('A timeless masterpiece.')).toBeInTheDocument();
  });

  it('renders localized review in Spanish', () => {
    render(<MediaCard {...defaultProps} locale="es" />);
    expect(screen.getByText('Una obra maestra atemporal.')).toBeInTheDocument();
  });

  it('renders localized review in Portuguese', () => {
    render(<MediaCard {...defaultProps} locale="pt" />);
    expect(screen.getByText('Uma obra-prima atemporal.')).toBeInTheDocument();
  });

  it('falls back to English review for unknown locale', () => {
    render(<MediaCard {...defaultProps} locale="fr" />);
    expect(screen.getByText('A timeless masterpiece.')).toBeInTheDocument();
  });

  it('renders genre chips', () => {
    render(<MediaCard {...defaultProps} />);
    expect(screen.getByText('Drama')).toBeInTheDocument();
  });

  it('links to IMDb page', () => {
    render(<MediaCard {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://www.imdb.com/title/tt0111161/');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows loading state', () => {
    render(<MediaCard titleId="tt0111161" loading={true} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<MediaCard titleId="tt0111161" error="Failed to load" imdb={{}} />);
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('renders without year when startYear is missing', () => {
    const props = {
      ...defaultProps,
      imdb: { ...defaultProps.imdb, startYear: undefined },
    };
    render(<MediaCard {...props} />);
    expect(screen.getByText('The Shawshank Redemption')).toBeInTheDocument();
  });

  it('handles string review (non-object)', () => {
    render(<MediaCard {...defaultProps} review="Simple review" />);
    expect(screen.getByText('Simple review')).toBeInTheDocument();
  });
});
