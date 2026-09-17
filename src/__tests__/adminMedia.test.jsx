import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FormEditor from '../../admin/src/components/FormEditor';
import MediaPreview from '../../admin/src/components/MediaPreview';
import { getContentType } from '../../admin/src/contentTypes';
import { validate } from '../../admin/src/validation';

const translations = { en: 'Title', es: 'Titulo', pt: 'Titulo' };
const doc = {
  id: 'tmdb-movie-550', category: 'watchlist', tmdbId: 550, mediaType: 'movie',
  title: 'Title', titleTranslations: translations, overview: { en: '', es: '', pt: '' },
  genresTranslations: { en: ['Drama'], es: ['Drama'], pt: ['Drama'] },
  posterPath: '/poster.jpg', myRating: 8.5, tmdbRating: 8.2,
  syncSource: 'tmdb', syncAccountId: 123, syncedAt: '2026-09-15T00:00:00Z',
  order: 10, custom: { preserved: true },
};

describe('admin legacy media compatibility', () => {
  it.each([['movies', 'movie'], ['series', 'tv']])('supports TMDB and legacy IMDb identity in %s', (slug, mediaType) => {
    const type = getContentType(slug);
    expect(validate(type, { ...doc, mediaType })).toEqual([]);
    expect(validate(type, { category: 'watchlist', titleId: 'tt1234567', myRating: 0 })).toEqual([]);
    expect(validate(type, { category: 'watchlist' })).toContain("Field 'titleId' is required.");
  });

  it.each([
    [{ tmdbId: 0 }, 'tmdbId'],
    [{ tmdbId: 2.5 }, 'tmdbId'],
    [{ tmdbId: 2147483648 }, 'tmdbId'],
    [{ mediaType: 'tv' }, 'mediaType'],
    [{ mediaType: null }, 'mediaType'],
    [{ titleTranslations: { en: 'Missing translations' } }, 'titleTranslations.es'],
    [{ overview: { ...translations, pt: null } }, 'overview.pt'],
    [{ genresTranslations: { en: ['Drama'], es: 'Drama', pt: [] } }, 'genresTranslations.es'],
    [{ posterPath: 'https://example.com/image.jpg' }, 'posterPath'],
    [{ imageUrl: 'http://example.com/image.jpg' }, 'imageUrl'],
    [{ imageUrl: 'javascript:alert(1)' }, 'imageUrl'],
    [{ imageUrl: 'https://93.184.216.34/image.jpg' }, 'imageUrl'],
    [{ imageUrl: 'https://[::1]/image.jpg' }, 'imageUrl'],
    [{ myRating: 0 }, 'half-point'],
    [{ myRating: 7.2 }, 'half-point'],
    [{ tmdbRating: 11 }, 'tmdbRating'],
    [{ syncedAt: 'invalid' }, 'syncedAt'],
  ])('validates malformed metadata %j', (change, expected) => {
    expect(validate(getContentType('movies'), { ...doc, ...change }).join('; ')).toContain(expected);
  });

  it('previews TMDB links without requiring an IMDb ID', () => {
    const { rerender } = render(<MediaPreview doc={doc} />);
    expect(screen.getByRole('link', { name: /Open on TMDB/ })).toHaveAttribute('href', 'https://www.themoviedb.org/movie/550');
    rerender(<MediaPreview doc={{ tmdbId: 1, mediaType: 'javascript:alert(1)' }} />);
    expect(screen.queryByRole('link', { name: /TMDB/ })).not.toBeInTheDocument();
    rerender(<MediaPreview doc={{ titleId: 'tt1234567' }} />);
    expect(screen.getByRole('link', { name: /IMDb/ })).toHaveAttribute('href', 'https://www.imdb.com/title/tt1234567/');
  });

  it('preserves ownership, unknown fields and empty locale strings when editing', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<FormEditor type={getContentType('movies')} initialDoc={doc} isNew={false} onSave={onSave} onClose={vi.fn()} />);
    expect(screen.getByRole('spinbutton', { name: 'Order', exact: true })).not.toHaveAttribute('readonly');
    expect(screen.getByRole('spinbutton', { name: 'syncAccountId' })).not.toHaveAttribute('readonly');
    fireEvent.change(screen.getByRole('textbox', { name: 'Overview (en)' }), { target: { value: 'Overview' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ ...doc, overview: { en: 'Overview', es: '', pt: '' } }));
  });

  it.each(['top-movies', 'top-series', 'top-tv'])('keeps %s order manually editable', category => {
    render(<FormEditor type={getContentType('movies')} initialDoc={{ ...doc, category }} isNew={false}
      onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('spinbutton', { name: 'Order', exact: true })).not.toHaveAttribute('readonly');
  });
});
