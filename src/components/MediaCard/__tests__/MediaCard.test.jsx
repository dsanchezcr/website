import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import MediaCard from '../MediaCard';

describe('MediaCard', () => {
  afterEach(() => vi.unstubAllGlobals());
  const defaultProps = {
    titleId: 'tt0111161',
    title: 'The Shawshank Redemption',
    imageUrl: 'https://imdb.com/poster.jpg',
    year: 1994,
    genres: ['Drama'],
    imdbRating: 9.3,
    myRating: 10,
    review: {
      en: 'A timeless masterpiece.',
      es: 'Una obra maestra atemporal.',
      pt: 'Uma obra-prima atemporal.',
    },
    locale: 'en',
  };

  it('renders the movie title with year', () => {
    render(<MediaCard {...defaultProps} />);
    expect(screen.getByText('The Shawshank Redemption (1994)')).toBeInTheDocument();
  });

  it('renders the IMDb rating', () => {
    render(<MediaCard {...defaultProps} />);
    expect(screen.getByText('IMDb ⭐ 9.3')).toBeInTheDocument();
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

  it('falls back to titleId when no title is provided (first-time load, no cache)', () => {
    render(<MediaCard titleId="tt0111161" />);
    expect(screen.getByText('tt0111161')).toBeInTheDocument();
  });

  it('renders without year when year is missing', () => {
    const props = { ...defaultProps, year: undefined };
    render(<MediaCard {...props} />);
    expect(screen.getByText('The Shawshank Redemption')).toBeInTheDocument();
  });

  it('renders without a poster image when imageUrl is missing', () => {
    const props = { ...defaultProps, imageUrl: undefined };
    const { container } = render(<MediaCard {...props} />);
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('handles string review (non-object)', () => {
    render(<MediaCard {...defaultProps} review="Simple review" />);
    expect(screen.getByText('Simple review')).toBeInTheDocument();
  });

  it.each(['en', 'es', 'pt'])('renders saved OMDb plot fallback and hotlinked poster in %s without fetching metadata', (locale) => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    render(<MediaCard {...defaultProps} locale={locale} plot="Stored English plot." />);
    expect(screen.getByText('Stored English plot.')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', defaultProps.imageUrl);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps localized overviews ahead of the English plot fallback', () => {
    render(<MediaCard {...defaultProps} locale="es" overview={{ es: 'Descripción guardada.' }} plot="English plot." />);
    expect(screen.getByText('Descripción guardada.')).toBeInTheDocument();
    expect(screen.queryByText('English plot.')).not.toBeInTheDocument();
  });

  it('uses an explicitly saved external poster instead of a legacy TMDB poster path', () => {
    render(<MediaCard {...defaultProps} tmdbId={278} mediaType="movie" posterPath="/old-poster.jpg" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', defaultProps.imageUrl);
  });

  it('uses IMDb links and ratings after auto-fill without deleting legacy metadata', () => {
    render(<MediaCard {...defaultProps} tmdbId={278} mediaType="movie" tmdbRating={8.7} metadataSource="omdb" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://www.imdb.com/title/tt0111161/');
    expect(screen.getByText('IMDb ⭐ 9.3')).toBeInTheDocument();
    expect(screen.queryByText(/TMDB ⭐/)).not.toBeInTheDocument();
  });
});
