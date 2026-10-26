import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import FormEditor from '../../admin/src/components/FormEditor';
import ContentManager from '../../admin/src/components/ContentManager';
import { getContentType } from '../../admin/src/contentTypes';
import { mergeTmdbMetadata } from '../../admin/src/tmdb';
import { validate } from '../../admin/src/validation';
import MediaCard from '../components/MediaCard/MediaCard';

const metadata = {
  tmdbId: 550, mediaType: 'movie', titleId: 'tt0111161', title: 'Fetched Title',
  year: 1994, plot: 'English plot', director: 'Director', posterPath: '/poster.jpg',
  imageUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg', tmdbRating: 8.7, genres: ['Drama', 'Mystery'],
  titleTranslations: { en: 'Fetched Title', es: 'Título nuevo', pt: 'Título novo' },
  overview: { en: 'English plot', es: 'Trama nueva', pt: 'Trama nova' },
  genresTranslations: { en: ['Drama', 'Mystery'], es: ['Drama', 'Misterio'], pt: ['Drama', 'Mistério'] },
};
const initialDoc = {
  id: 'legacy-id', category: 'watchlist', order: 4, tmdbId: 550, mediaType: 'movie',
  title: 'Original title', year: 2001, plot: 'Original plot', director: 'Original Director',
  imageUrl: 'https://example.org/old.jpg', imdbRating: 7.2, genres: ['Original'], myRating: 9.5,
  review: { en: 'My review', es: 'Mi reseña', pt: 'Minha avaliação', fr: 'Avis' },
  titleTranslations: { en: 'Old title', es: 'Título ES', pt: 'Título PT', fr: 'Titre' },
  overview: { en: 'Old plot', es: 'Trama ES', pt: 'Trama PT', fr: 'Intrigue' },
  genresTranslations: { en: ['Old'], es: ['Drama'], pt: ['Drama'] },
  posterPath: '/old.jpg', tmdbRating: 8, syncSource: 'tmdb', metadataSource: 'omdb',
  syncAccountId: 123, syncedAt: '2026-09-15T00:00:00Z', custom: { nested: ['preserve', { value: true }] },
};
const response = (body = metadata, status = 200) => new Response(JSON.stringify(body), { status });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((success, fail) => { resolve = success; reject = fail; });
  return { promise, resolve, reject };
};
const button = name => screen.getByRole('button', { name, exact: true });
const field = name => screen.getByLabelText(name, { exact: true });
const rawDoc = () => {
  fireEvent.click(button('Raw JSON'));
  return JSON.parse(field('Raw JSON document').value);
};
const editor = (doc = initialDoc, slug = 'movies', isNew = false) => {
  const props = { type: getContentType(slug), initialDoc: doc, isNew,
    onSave: vi.fn().mockResolvedValue(undefined), onClose: vi.fn() };
  return { ...render(<FormEditor {...props} />), props };
};
beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(response()))));
afterEach(() => vi.unstubAllGlobals());

describe('TMDB media editor', () => {
  it.each([['movies', 'movie', true], ['movies', 'movie', false], ['series', 'tv', true], ['series', 'tv', false]])(
    'fetches %s/%s only on click and saves explicitly (new=%s)', async (slug, mediaType, isNew) => {
      const doc = { tmdbId: 550, category: 'watchlist', custom: { keep: true } };
      const data = { ...metadata, mediaType };
      fetch.mockResolvedValue(response(data));
      const { props } = editor(doc, slug, isNew);
      expect(field('TMDB ID').parentElement).toContainElement(button('Fetch Data'));
      fireEvent.blur(field('TMDB ID'));
      expect(fetch).not.toHaveBeenCalled();
      fireEvent.click(button('Fetch Data'));
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Metadata fetched from TMDB'));
      expect(field('Title')).toHaveValue(metadata.title);
      expect(field('IMDb Title ID')).toHaveValue(metadata.titleId);
      expect(field('Year')).toHaveValue(1994);
      expect(field('Director / Creators')).toHaveValue(metadata.director);
      expect(field('Type')).toHaveValue(mediaType);
      expect(field('Localized title (es)')).toHaveValue(metadata.titleTranslations.es);
      expect(field('Overview (pt)')).toHaveValue(metadata.overview.pt);
      expect(screen.getByRole('img', { name: 'preview' })).toHaveAttribute('src', metadata.imageUrl);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0][0]).toBe(`/api/content-admin/tmdb?tmdbId=550&mediaType=${mediaType}`);
      expect(props.onSave).not.toHaveBeenCalled();
      const merged = rawDoc();
      expect(merged).toEqual({ ...doc, ...data, metadataSource: 'tmdb' });
      fireEvent.click(button('Save'));
      await waitFor(() => expect(props.onSave).toHaveBeenCalledExactlyOnceWith(merged));
    },
  );
  it.each([null, 0, -1, 1.5, 2147483648, 'tt0111161'])('does not fetch or mutate invalid ID %j', tmdbId => {
    const doc = { ...initialDoc, tmdbId };
    editor(doc);
    fireEvent.click(button('Fetch Data'));
    expect(screen.getByRole('alert')).toHaveTextContent('positive TMDB ID');
    expect(fetch).not.toHaveBeenCalled();
    expect(rawDoc()).toEqual(doc);
  });
  it('preserves curated fields and existing translations but refreshes provider fields', async () => {
    const snapshot = structuredClone(initialDoc);
    const { props } = editor();
    fireEvent.change(field('My Rating (0–10)'), { target: { value: '8.3' } });
    fireEvent.change(field('Review (es)'), { target: { value: 'Reseña editada' } });
    fireEvent.change(field('Order'), { target: { value: '6' } });
    fireEvent.click(button('Fetch Data'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Metadata fetched'));
    const merged = rawDoc();
    expect(merged).toMatchObject({
      ...initialDoc, title: metadata.title, year: 1994, plot: metadata.plot, director: metadata.director,
      titleId: metadata.titleId, imageUrl: metadata.imageUrl, posterPath: metadata.posterPath,
      tmdbRating: metadata.tmdbRating, genres: metadata.genres, myRating: 8.3, order: 6, metadataSource: 'tmdb',
      review: { ...initialDoc.review, es: 'Reseña editada' },
      titleTranslations: { ...initialDoc.titleTranslations, en: metadata.title },
      overview: { ...initialDoc.overview, en: metadata.plot },
      genresTranslations: { ...initialDoc.genresTranslations, en: metadata.genres },
    });
    expect(initialDoc).toEqual(snapshot);
    expect(validate(getContentType('movies'), merged)).toEqual([]);
    fireEvent.click(button('Save'));
    await waitFor(() => expect(props.onSave).toHaveBeenCalledWith(merged));
  });
  it('retains missing display metadata, but does not retain mismatched external IDs or community ratings', () => {
    const merged = mergeTmdbMetadata({ ...initialDoc, titleId: 'tt9999999' }, {
      ...metadata, titleId: null, tmdbRating: null, year: null, plot: null, director: null,
      imageUrl: null, posterPath: null, genres: [], overview: { en: '', es: '', pt: '' },
      genresTranslations: { en: [], es: [], pt: [] },
    });
    expect(merged).toMatchObject({
      imageUrl: initialDoc.imageUrl, year: initialDoc.year, plot: initialDoc.plot, director: initialDoc.director,
      titleId: null, tmdbRating: null, genres: initialDoc.genres, overview: initialDoc.overview,
    });
  });
  it('fills missing translations without fabricating values and preserves arbitrary locale keys', () => {
    const merged = mergeTmdbMetadata({
      titleTranslations: { es: 'Curated', fr: 'Titre' }, overview: { pt: 'Curated plot' },
    }, { ...metadata, titleTranslations: { en: 'Title', es: '', pt: '' }, overview: { en: 'Plot', es: '', pt: '' } });
    expect(merged.titleTranslations).toEqual({ en: 'Title', es: 'Curated', pt: '', fr: 'Titre' });
    expect(merged.overview).toEqual({ en: 'Plot', es: '', pt: 'Curated plot' });
  });
  it('preserves comma-separated genre editing before and after lookup', async () => {
    const { props } = editor();
    for (const value of ['Comedy', 'Comedy,', 'Comedy, ', 'Comedy, Adventure']) {
      fireEvent.change(field('Genres'), { target: { value } });
      expect(field('Genres')).toHaveValue(value);
    }
    fireEvent.click(button('Fetch Data'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Metadata fetched'));
    expect(field('Genres')).toHaveValue('Drama, Mystery');
    fireEvent.change(field('Genres'), { target: { value: 'Drama, Mystery, Comedy' } });
    fireEvent.click(button('Save'));
    await waitFor(() => expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({
      genres: ['Drama', 'Mystery', 'Comedy'], metadataSource: 'tmdb',
    })));
  });
  it.each([400, 401, 403, 404, 429, 502, 503, 504])('preserves edits after HTTP %s and allows retry', async status => {
    fetch.mockResolvedValueOnce(response({ error: 'private token' }, status));
    const { props } = editor();
    fireEvent.change(field('Title'), { target: { value: 'Unsaved edit' } });
    fireEvent.click(button('Fetch Data'));
    expect(await screen.findByRole('alert')).not.toHaveTextContent('private');
    expect(rawDoc()).toEqual({ ...initialDoc, title: 'Unsaved edit' });
    expect(props.onSave).not.toHaveBeenCalled();
    fireEvent.click(button('Form'));
    fireEvent.click(button('Fetch Data'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Metadata fetched'));
  });
  it.each(['network', 'malformed', 'mismatch'])('does not mutate on %s failure', async failure => {
    if (failure === 'network') fetch.mockRejectedValue(new Error('private token'));
    else fetch.mockResolvedValue(response({ ...metadata, ...(failure === 'mismatch' ? { mediaType: 'tv' } : { director: {} }) }));
    editor();
    fireEvent.click(button('Fetch Data'));
    expect(await screen.findByRole('alert')).not.toHaveTextContent('private');
    expect(rawDoc()).toEqual(initialDoc);
  });
  it('disables editing, duplicate requests and saves while lookup is pending', async () => {
    const pending = deferred();
    fetch.mockReturnValue(pending.promise);
    const { props } = editor();
    fireEvent.click(button('Fetch Data'));
    for (const control of screen.getByRole('group', { name: 'Content fields' }).querySelectorAll('input,textarea,select,button'))
      expect(control).toBeDisabled();
    for (const name of ['Fetch Data', 'Save', 'Raw JSON', 'Form']) {
      expect(button(name)).toBeDisabled();
      fireEvent.click(button(name));
    }
    fireEvent.change(field('Title'), { target: { value: 'Must not apply' } });
    expect(field('Title')).toHaveValue(initialDoc.title);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(props.onSave).not.toHaveBeenCalled();
    await act(async () => pending.resolve(response()));
    expect(button('Save')).toBeEnabled();
  });
  it.each(['Close', 'Cancel', 'backdrop', 'unmount'])('aborts on %s and ignores late completion', async action => {
    const pending = deferred();
    fetch.mockReturnValue(pending.promise);
    const { props, container, unmount } = editor();
    fireEvent.click(button('Fetch Data'));
    const signal = fetch.mock.calls[0][1].signal;
    if (action === 'unmount') unmount();
    else if (action === 'backdrop') fireEvent.click(container.firstChild);
    else fireEvent.click(button(action));
    expect(signal.aborted).toBe(true);
    await act(async () => pending.resolve(response()));
    expect(props.onSave).not.toHaveBeenCalled();
    if (action !== 'unmount') expect(rawDoc()).toEqual(initialDoc);
  });
  it.each(['success', 'failure'])('ignores stale %s after changing documents', async outcome => {
    const first = deferred(), second = deferred();
    fetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { props, rerender } = editor();
    fireEvent.click(button('Fetch Data'));
    const oldSignal = fetch.mock.calls[0][1].signal;
    const nextDoc = { tmdbId: 1399, category: 'completed', title: 'Next series', mediaType: 'tv' };
    rerender(<FormEditor {...props} type={getContentType('series')} initialDoc={nextDoc} />);
    expect(oldSignal.aborted).toBe(true);
    fireEvent.click(button('Fetch Data'));
    await act(async () => outcome === 'success' ? first.resolve(response()) : first.reject(new Error('Old error')));
    expect(field('Title')).toHaveValue('Next series');
    expect(button('Save')).toBeDisabled();
    await act(async () => second.resolve(response({ ...metadata, tmdbId: 1399, mediaType: 'tv', title: 'Current series' })));
    expect(field('Title')).toHaveValue('Current series');
    expect(button('Save')).toBeEnabled();
  });
  it.each(['gaming', 'parks', 'monthly-updates'])('does not expose lookup for %s', slug => {
    editor({}, slug, true);
    expect(screen.queryByRole('button', { name: 'Fetch Data' })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['en', 'es', 'pt'])('renders newly enriched records publicly in %s without provider requests', locale => {
    const doc = mergeTmdbMetadata({ category: 'watchlist', myRating: 0 }, metadata);
    render(<MediaCard {...doc} locale={locale} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://www.themoviedb.org/movie/550');
    expect(screen.getByRole('heading')).toHaveTextContent(metadata.titleTranslations[locale]);
    expect(screen.getByText(metadata.overview[locale])).toBeInTheDocument();
    expect(screen.getByText('TMDB ⭐ 8.7')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('TMDB ContentManager integration', () => {
  it.each([['movies', 'movie', true], ['movies', 'movie', false], ['series', 'tv', true], ['series', 'tv', false]])(
    'writes %s/%s only on Save with ETags on edits (new=%s)', async (slug, mediaType, isNew) => {
      const doc = { ...initialDoc, mediaType };
      fetch.mockImplementation((url, options = {}) => {
        if (url.endsWith('?meta=partitions')) return Promise.resolve(response(['watchlist']));
        if (url.startsWith('/api/content-admin/tmdb?')) return Promise.resolve(response({ ...metadata, mediaType }));
        if (options.method === 'POST' || options.method === 'PUT') return Promise.resolve(response(JSON.parse(options.body)));
        if (url.includes('/legacy-id?pk=')) return Promise.resolve(new Response(JSON.stringify(doc), { headers: { ETag: '"original-etag"' } }));
        if (url === `/api/content-admin/${slug}`) return Promise.resolve(response([doc]));
        throw new Error(`Unexpected test request: ${url}`);
      });
      render(<ContentManager type={getContentType(slug)} />);
      await screen.findByRole('button', { name: 'Edit', exact: true });
      const label = getContentType(slug).label;
      fireEvent.click(button(isNew ? `+ New ${label}` : 'Edit'));
      await screen.findByRole('heading', { name: `${isNew ? 'New' : 'Edit'} ${label}` });
      if (isNew) {
        fireEvent.change(field('TMDB ID'), { target: { value: '550' } });
        fireEvent.change(field('Category'), { target: { value: 'watchlist' } });
      }
      fireEvent.click(button('Fetch Data'));
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Metadata fetched'));
      const writes = () => fetch.mock.calls.filter(([, options]) => ['POST', 'PUT', 'DELETE'].includes(options?.method));
      expect(writes()).toHaveLength(0);
      fireEvent.click(button('Save'));
      await waitFor(() => expect(writes()).toHaveLength(1));
      const [url, options] = writes()[0];
      expect(url).toBe(`/api/content-admin/${slug}${isNew ? '' : '/legacy-id'}`);
      expect(options.method).toBe(isNew ? 'POST' : 'PUT');
      expect(JSON.parse(options.body)).toMatchObject({ tmdbId: 550, mediaType, metadataSource: 'tmdb', tmdbRating: 8.7 });
      if (!isNew) {
        expect(options.headers['If-Match']).toBe('"original-etag"');
        expect(JSON.parse(options.body)).toMatchObject({ id: doc.id, order: doc.order, myRating: doc.myRating,
          review: doc.review, custom: doc.custom, syncAccountId: doc.syncAccountId, syncedAt: doc.syncedAt });
      }
    },
  );
});
