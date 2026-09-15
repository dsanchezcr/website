import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MediaCard from '../MediaCard';
import MediaCardList from '../MediaCardList';
import ApiMediaCardList from '../ApiMediaCardList';
import TmdbAttribution from '../TmdbAttribution';

const locale = vi.hoisted(() => ({ value: 'en' }));
vi.mock('@site/src/hooks', () => ({ useLocale: () => locale.value }));
vi.mock('@site/src/config/environment', () => ({
  config: { getApiEndpoint: () => '', routes: { contentMovies: '/api/content/movies', contentSeries: '/api/content/series' } },
}));

const item = {
  id: 'tmdb-tv-watch-10', tmdbId: 10, mediaType: 'tv', category: 'watchlist',
  title: 'Stored English title', titleTranslations: { en: 'English title', es: 'Título español', pt: 'Título português' },
  posterPath: '/poster.jpg', tmdbRating: 7.8, myRating: 8.5,
  overview: { en: 'English overview', es: 'Descripción', pt: 'Descrição' },
  genresTranslations: { en: ['Drama'], es: ['Drama español'], pt: ['Drama português'] },
  review: { en: 'My review', es: 'Mi reseña', pt: 'Minha resenha' },
  syncSource: 'tmdb', syncedAt: '2026-09-15T12:00:00Z', order: 2,
};

afterEach(() => {
  locale.value = 'en';
  vi.unstubAllGlobals();
});

describe('stored TMDB media', () => {
  it.each([
    ['en', 'English title', 'My: 8.5/10', 'English overview', 'Drama'],
    ['es', 'Título español', 'Mi nota: 8.5/10', 'Descripción', 'Drama español'],
    ['pt', 'Título português', 'Minha nota: 8.5/10', 'Descrição', 'Drama português'],
  ])('renders localized metadata in %s with no metadata fetch', (language, title, rating, overview, genre) => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    render(<MediaCard {...item} locale={language} />);
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByText(rating)).toBeInTheDocument();
    expect(screen.getByText(overview)).toBeInTheDocument();
    expect(screen.getByText(genre)).toBeInTheDocument();
    expect(screen.getByText('TMDB ⭐ 7.8')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w500/poster.jpg');
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://www.themoviedb.org/tv/10');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses movie links without an IMDb ID and preserves null watchlist ratings', () => {
    render(<MediaCard {...item} mediaType="movie" myRating={null} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://www.themoviedb.org/movie/10');
    expect(screen.queryByText(/My:/)).not.toBeInTheDocument();
  });

  it('does not relabel a legacy IMDb rating as TMDB', () => {
    render(<MediaCard {...item} tmdbRating={null} imdbRating={9.9} />);
    expect(screen.queryByText(/9.9/)).not.toBeInTheDocument();
  });

  it('falls back to English metadata and a poster placeholder', () => {
    render(<MediaCard {...item} locale="es" titleTranslations={{ en: 'Fallback' }} posterPath={null} />);
    expect(screen.getByRole('heading', { name: 'Fallback' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Póster no disponible' })).toBeInTheDocument();
  });

  it('sorts current snapshots newest first while retaining older imported titles', () => {
    const { container } = render(<MediaCardList category="watchlist" items={[
      { ...item, id: 'old', tmdbId: 1, syncedAt: '2026-01-01T00:00:00Z', order: 999 },
      { ...item, id: 'second', tmdbId: 2, order: 1 },
      { ...item, id: 'newest', tmdbId: 3, order: 2 },
    ]} />);
    expect([...container.querySelectorAll('a[href*="/tv/"]')].map(link => link.href)).toEqual([
      'https://www.themoviedb.org/tv/3', 'https://www.themoviedb.org/tv/2', 'https://www.themoviedb.org/tv/1',
    ]);
  });

  it.each(['top-movies', 'top-series', 'top-tv'])('preserves manual %s ascending order', category => {
    const { container } = render(<MediaCardList category={category} items={[
      { ...item, category, id: 'two', tmdbId: 2, order: 2 },
      { ...item, category, id: 'one', tmdbId: 1, order: 1, syncedAt: '2026-01-01T00:00:00Z' },
    ]} />);
    expect(container.querySelector('a[href*="/tv/"]')).toHaveAttribute('href', 'https://www.themoviedb.org/tv/1');
  });

  it.each(['en', 'es', 'pt'])('provides TMDB logo, credits and required attribution in %s', language => {
    render(<TmdbAttribution locale={language} />);
    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'TMDB' })).toBeInTheDocument();
    expect(screen.getByText('This product uses the TMDB API but is not endorsed or certified by TMDB.')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://www.themoviedb.org');
  });

  it('fetches only stored content and forwards all TMDB metadata to cards', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [item] });
    vi.stubGlobal('fetch', fetch);
    locale.value = 'pt';
    render(<ApiMediaCardList contentType="series" category="watchlist" />);
    expect(await screen.findByRole('heading', { name: 'Título português' })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe('/api/content/series?category=watchlist');
    expect(JSON.stringify(fetch.mock.calls)).not.toMatch(/token|session_id|tmdb\/sync/i);
  });

  it.each([
    ['es', 'Cargando contenido...', 'No se pudo cargar el contenido. Inténtalo de nuevo más tarde.'],
    ['pt', 'Carregando conteúdo...', 'Não foi possível carregar o conteúdo. Tente novamente mais tarde.'],
  ])('localizes loading and error states in %s without exposing upstream errors', async (language, loading, error) => {
    locale.value = language;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(<ApiMediaCardList contentType="movies" />);
    expect(screen.getByRole('status')).toHaveTextContent(loading);
    expect(await screen.findByRole('alert')).toHaveTextContent(error);
  });

  it('rejects malformed public payloads rather than rendering a broken list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ error: 'internal detail' }) }));
    render(<ApiMediaCardList contentType="movies" />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Failed to load content'));
    expect(screen.queryByText(/internal detail/)).not.toBeInTheDocument();
  });
});
