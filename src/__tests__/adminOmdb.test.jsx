import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import FormEditor from '../../admin/src/components/FormEditor';
import ContentManager from '../../admin/src/components/ContentManager';
import { getContentType } from '../../admin/src/contentTypes';
import { mergeOmdbMetadata } from '../../admin/src/omdb';
import { validate } from '../../admin/src/validation';

const metadata = {
  titleId: 'tt0111161', title: 'Fetched Title', year: 1994, plot: 'An English plot.',
  director: 'Example Director', type: 'movie', imageUrl: 'https://example.org/new-poster.jpg',
  imdbRating: 8.7, genres: ['Drama', 'Mystery'],
};
const initialDoc = {
  id: 'legacy-id', titleId: metadata.titleId, category: 'watchlist', order: 4,
  title: 'Original title', year: 2001, plot: 'Original plot', director: 'Original Director',
  mediaType: 'movie', imageUrl: 'https://example.org/old-poster.jpg', imdbRating: 7.2,
  genres: ['Original genre'], myRating: 9.5,
  review: { en: 'My review', es: 'Mi reseña', pt: 'Minha avaliação', fr: 'Avis' },
  titleTranslations: { en: 'Old English title', es: 'Título ES', pt: 'Título PT', fr: 'Titre' },
  overview: { en: 'Old English plot', es: 'Trama ES', pt: 'Trama PT', fr: 'Intrigue' },
  genresTranslations: { en: ['Old'], es: ['Drama'], pt: ['Drama'] },
  tmdbId: 550, posterPath: '/old.jpg', tmdbRating: 8, syncSource: 'tmdb',
  metadataSource: 'tmdb',
  syncAccountId: 123, syncedAt: '2026-09-15T00:00:00Z',
  custom: { nested: ['preserve', { value: true }] },
};
const response = (body = metadata, status = 200) => new Response(JSON.stringify(body), { status });
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((success, fail) => { resolve = success; reject = fail; });
  return { promise, resolve, reject };
};
const button = name => screen.getByRole('button', { name, exact: true });
const field = name => screen.getByLabelText(name, { exact: true });
const rawDoc = () => {
  fireEvent.click(button('Raw JSON'));
  return JSON.parse(field('Raw JSON document').value);
};
const editor = (doc = initialDoc, slug = 'movies', isNew = false, extra = {}) => {
  const props = {
    type: getContentType(slug), initialDoc: doc, isNew,
    onSave: vi.fn().mockResolvedValue(undefined), onClose: vi.fn(), ...extra,
  };
  return { ...render(<FormEditor {...props} />), props };
};

beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(response()))));
afterEach(() => vi.unstubAllGlobals());

describe('OMDb media editor', () => {
  it.each([['movies', 'movie', true], ['movies', 'movie', false], ['series', 'series', true], ['series', 'series', false]])(
    'explicitly fetches for %s/%s (new=%s), shows merged fields, and waits for Save', async (slug, type, isNew) => {
      const doc = { titleId: '  tt0111161  ', category: 'watchlist', custom: { keep: true } };
      fetch.mockResolvedValue(response({ ...metadata, type }));
      const { props } = editor(doc, slug, isNew);
      expect(fetch).not.toHaveBeenCalled();
      // The action shares the input row, rather than being an automatic/on-blur lookup.
      expect(field('IMDb Title ID').parentElement).toContainElement(button('Fetch Data'));
      fireEvent.blur(field('IMDb Title ID'));
      expect(fetch).not.toHaveBeenCalled();
      fireEvent.click(button('Fetch Data'));
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Metadata fetched'));
      expect(field('Title')).toHaveValue(metadata.title);
      expect(field('IMDb Title ID')).toHaveValue(metadata.titleId);
      expect(field('Year')).toHaveValue(1994);
      expect(field('Plot')).toHaveValue(metadata.plot);
      expect(field('Director')).toHaveValue(metadata.director);
      expect(field('Type')).toHaveValue(type === 'series' ? 'tv' : 'movie');
      expect(field('Genres')).toHaveValue('Drama, Mystery');
      expect(field('Poster Image URL')).toHaveValue(metadata.imageUrl);
      expect(screen.getByRole('img', { name: 'preview' })).toHaveAttribute('src', metadata.imageUrl);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0][0]).toBe('/api/content-admin/omdb?imdbId=tt0111161');
      expect(props.onSave).not.toHaveBeenCalled();
      const merged = rawDoc();
      expect(merged).toEqual({
        ...doc, titleId: metadata.titleId, title: metadata.title, year: 1994, plot: metadata.plot, director: metadata.director,
        mediaType: type === 'series' ? 'tv' : 'movie', genres: metadata.genres,
        imageUrl: metadata.imageUrl, imdbRating: 8.7, metadataSource: 'omdb',
      });
      expect(merged).not.toHaveProperty('titleTranslations');
      expect(merged).not.toHaveProperty('overview');
      fireEvent.click(button('Save'));
      await waitFor(() => expect(props.onSave).toHaveBeenCalledExactlyOnceWith(merged));
    },
  );

  it('normalizes a whitespace-padded IMDb ID on successful lookup and Save without changing document identity', async () => {
    const doc = { ...initialDoc, titleId: '  tt0111161  ' };
    const { props } = editor(doc);
    expect(field('IMDb Title ID')).toHaveValue('  tt0111161  ');
    fireEvent.click(button('Fetch Data'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Metadata fetched'));
    expect(field('IMDb Title ID')).toHaveValue('tt0111161');
    expect(field('ID')).toHaveValue(doc.id);
    expect(props.onSave).not.toHaveBeenCalled();
    expect(doc.titleId).toBe('  tt0111161  ');
    fireEvent.click(button('Save'));
    await waitFor(() => expect(props.onSave).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      id: doc.id, titleId: 'tt0111161', metadataSource: 'omdb',
      tmdbId: doc.tmdbId, category: doc.category, order: doc.order,
    })));
  });

  it.each(['', 'tt12345', 'tt1234567890123', 'TT0111161', 'tt１２３４５６', 'tt0111161?x=y', 'tt0111161\nx'])(
    'does not fetch or mutate the form for invalid input %j', async titleId => {
      const doc = { ...initialDoc, titleId };
      const { props } = editor(doc);
      fireEvent.click(button('Fetch Data'));
      expect(screen.getByRole('alert')).toHaveTextContent('tt followed by 6–12 digits');
      expect(fetch).not.toHaveBeenCalled();
      expect(rawDoc()).toEqual(doc);
      expect(props.onSave).not.toHaveBeenCalled();
    },
  );

  it('preserves curated fields, every translation locale and legacy metadata; legacy fields and order stay editable', async () => {
    const snapshot = structuredClone(initialDoc);
    const { props } = editor();
    const otherFields = screen.getByRole('heading', { name: 'Other fields' }).parentElement;
    for (const key of ['tmdbId', 'posterPath', 'tmdbRating', 'syncSource', 'syncAccountId', 'syncedAt']) {
      expect(within(otherFields).getByLabelText(key)).not.toHaveAttribute('readonly');
    }
    expect(field('Order')).not.toHaveAttribute('readonly');
    fireEvent.change(field('My Rating (0–10)'), { target: { value: '8.5' } });
    fireEvent.change(field('Review (es)'), { target: { value: 'Reseña editada' } });
    fireEvent.change(field('Order'), { target: { value: '6' } });
    fireEvent.change(field('tmdbRating'), { target: { value: '7.5' } });
    fireEvent.click(button('Fetch Data'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Metadata fetched'));
    expect(field('Localized title (en)')).toHaveValue(metadata.title);
    expect(field('Overview (en)')).toHaveValue(metadata.plot);
    expect(field('Genres')).toHaveValue('Drama, Mystery');
    const expected = {
      ...initialDoc, title: metadata.title, year: metadata.year, plot: metadata.plot,
      director: metadata.director, imageUrl: metadata.imageUrl, imdbRating: metadata.imdbRating,
      genres: metadata.genres, myRating: 8.5, order: 6, tmdbRating: 7.5, metadataSource: 'omdb',
      review: { ...initialDoc.review, es: 'Reseña editada' },
      titleTranslations: { ...initialDoc.titleTranslations, en: metadata.title },
      overview: { ...initialDoc.overview, en: metadata.plot },
    };
    expect(rawDoc()).toEqual(expected);
    expect(initialDoc).toEqual(snapshot);
    expect(props.onSave).not.toHaveBeenCalled();
    fireEvent.click(button('Save'));
    await waitFor(() => expect(props.onSave).toHaveBeenCalledWith(expected));
  });

  it.each([null, 'N/A', '  '])('missing optional metadata (%j) never overwrites existing values', async missing => {
    fetch.mockResolvedValue(response({
      ...metadata, year: null, plot: missing, director: missing, imageUrl: missing,
      imdbRating: null, genres: [],
    }));
    editor();
    fireEvent.click(button('Fetch Data'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Metadata fetched'));
    expect(field('Poster Image URL')).toHaveValue(initialDoc.imageUrl);
    expect(rawDoc()).toEqual({
      ...initialDoc, title: metadata.title, metadataSource: 'omdb',
      titleTranslations: { ...initialDoc.titleTranslations, en: metadata.title },
    });
  });

  it('does not fabricate English or other translation keys in partial localized objects', () => {
    const doc = { titleTranslations: { es: 'Título', fr: null }, overview: { pt: 'Trama' } };
    const merged = mergeOmdbMetadata(doc, metadata);
    expect(merged.titleTranslations).toEqual(doc.titleTranslations);
    expect(merged.overview).toEqual(doc.overview);
    expect(merged.plot).toBe(metadata.plot);
    expect(merged.director).toBe(metadata.director);
  });

  it('keeps typed comma separators before and after replacing visible genres with fetched data', async () => {
    const { props } = editor({ ...initialDoc, genres: [] });
    for (const text of ['Comedy', 'Comedy,', 'Comedy, ', 'Comedy, Adventure']) {
      fireEvent.change(field('Genres'), { target: { value: text } });
      expect(field('Genres')).toHaveValue(text);
    }
    fireEvent.blur(field('Genres'));
    expect(field('Genres')).toHaveValue('Comedy, Adventure');
    fireEvent.click(button('Fetch Data'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Metadata fetched'));
    expect(field('Genres')).toHaveValue('Drama, Mystery');
    for (const text of ['Drama, Mystery,', 'Drama, Mystery, ', 'Drama, Mystery, Comedy']) {
      fireEvent.change(field('Genres'), { target: { value: text } });
      expect(field('Genres')).toHaveValue(text);
    }
    fireEvent.click(button('Save'));
    await waitFor(() => expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({
      genres: ['Drama', 'Mystery', 'Comedy'], metadataSource: 'omdb',
    })));
  });

  it.each([['movies', 'series', 'Series'], ['series', 'movie', 'Movies']])(
    'rejects %s/%s mismatch without changing any field', async (slug, type, destination) => {
      const doc = { ...initialDoc, mediaType: slug === 'series' ? 'tv' : 'movie' };
      fetch.mockResolvedValue(response({ ...metadata, type }));
      editor(doc, slug);
      fireEvent.click(button('Fetch Data'));
      expect(await screen.findByRole('alert')).toHaveTextContent(`Use the ${destination} section`);
      expect(rawDoc()).toEqual(doc);
    },
  );

  it.each([
    [400, 'not an episode'], [401, 'Sign in again'], [403, 'admin role'],
    [404, 'Title not found'], [429, 'limit reached'], [502, 'unavailable'],
    [503, 'administrator'], [504, 'timed out'],
  ])('keeps edits after HTTP %s and allows a subsequent successful lookup', async (status, message) => {
    fetch.mockResolvedValueOnce(response({ error: 'secret provider response' }, status));
    const { props } = editor();
    fireEvent.change(field('Title'), { target: { value: 'Unsaved manual edit' } });
    fireEvent.click(button('Fetch Data'));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('alert')).not.toHaveTextContent('secret');
    expect(rawDoc()).toEqual({ ...initialDoc, title: 'Unsaved manual edit' });
    expect(props.onSave).not.toHaveBeenCalled();
    fireEvent.click(button('Form'));
    fireEvent.click(button('Fetch Data'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Metadata fetched'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(['network', 'malformed'])('keeps the complete document after %s failure', async failure => {
    if (failure === 'network') fetch.mockRejectedValue(new Error('private provider URL'));
    else fetch.mockResolvedValue(response({ ...metadata, director: { en: 'invalid' } }));
    editor();
    fireEvent.click(button('Fetch Data'));
    expect(await screen.findByRole('alert')).not.toHaveTextContent('private');
    expect(rawDoc()).toEqual(initialDoc);
  });

  it('disables all editing, generation, duplicate fetching, saving and raw switching while pending', async () => {
    const pending = deferred();
    fetch.mockReturnValue(pending.promise);
    const { props } = editor();
    fireEvent.click(button('Fetch Data'));
    expect(screen.getByRole('status')).toHaveTextContent('Fetching metadata');
    for (const control of screen.getByRole('group', { name: 'Content fields' }).querySelectorAll('input,textarea,select,button')) {
      expect(control).toBeDisabled();
    }
    for (const name of ['Fetch Data', 'Save', 'Raw JSON', 'Form']) {
      expect(button(name)).toBeDisabled();
      fireEvent.click(button(name));
    }
    fireEvent.change(field('Title'), { target: { value: 'Must not apply' } });
    expect(field('Title')).toHaveValue(initialDoc.title);
    expect(button('Close')).toBeEnabled();
    expect(button('Cancel')).toBeEnabled();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(props.onSave).not.toHaveBeenCalled();
    await act(async () => pending.resolve(response()));
    expect(button('Save')).toBeEnabled();
    expect(field('Title')).toHaveValue(metadata.title);
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
    if (action !== 'unmount') {
      expect(props.onClose).toHaveBeenCalledOnce();
      expect(rawDoc()).toEqual(initialDoc);
    }
  });

  it.each(['success', 'failure'])('ignores a stale %s when a different document has an active lookup', async outcome => {
    const first = deferred();
    const second = deferred();
    fetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { props, rerender } = editor();
    fireEvent.click(button('Fetch Data'));
    const oldSignal = fetch.mock.calls[0][1].signal;
    const nextDoc = { titleId: 'tt1234567', category: 'completed', title: 'Next series', mediaType: 'tv' };
    rerender(<FormEditor {...props} type={getContentType('series')} initialDoc={nextDoc} />);
    expect(oldSignal.aborted).toBe(true);
    fireEvent.click(button('Fetch Data'));
    await act(async () => {
      if (outcome === 'success') first.resolve(response());
      else first.reject(new Error('Old error'));
    });
    expect(field('Title')).toHaveValue('Next series');
    expect(button('Save')).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await act(async () => second.resolve(response({ ...metadata, titleId: 'tt1234567', title: 'Current series', type: 'series' })));
    expect(field('Title')).toHaveValue('Current series');
    expect(button('Save')).toBeEnabled();
  });

  it.each(['movies', 'series'])('validates optional plain plot/director strings for %s', slug => {
    const base = { category: 'watchlist', titleId: 'tt0111161' };
    expect(validate(getContentType(slug), { ...base, plot: 'English plot', director: 'Director' })).toEqual([]);
    expect(validate(getContentType(slug), { ...base, plot: null, director: null })).toEqual([]);
    for (const key of ['plot', 'director']) {
      expect(validate(getContentType(slug), { ...base, [key]: { en: 'Not a string' } }))
        .toContain(`Field '${key}' must be a string.`);
    }
  });

  it.each(['gaming', 'parks', 'monthly-updates'])('does not expose OMDb fetching in %s', slug => {
    editor({}, slug, true);
    expect(screen.queryByRole('button', { name: 'Fetch Data' })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('OMDb ContentManager integration', () => {
  it.each([['movies', 'movie', true], ['movies', 'movie', false], ['series', 'series', true], ['series', 'series', false]])(
    'writes %s/%s metadata only after explicit Save, preserving ETags on edit (new=%s)', async (slug, type, isNew) => {
      const doc = { ...initialDoc, titleId: '  tt0111161  ', mediaType: type === 'movie' ? 'movie' : 'tv' };
      fetch.mockImplementation((url, options = {}) => {
        if (url.endsWith('?meta=partitions')) return Promise.resolve(response(['watchlist']));
        if (url.startsWith('/api/content-admin/omdb?')) return Promise.resolve(response({ ...metadata, type }));
        if (options.method === 'POST' || options.method === 'PUT') return Promise.resolve(response(JSON.parse(options.body)));
        if (url.includes('/legacy-id?pk=')) {
          return Promise.resolve(new Response(JSON.stringify(doc), { headers: { ETag: '"original-etag"' } }));
        }
        if (url === `/api/content-admin/${slug}`) return Promise.resolve(response([doc]));
        throw new Error(`Unexpected test request: ${url}`);
      });
      render(<ContentManager type={getContentType(slug)} />);
      await screen.findByRole('button', { name: 'Edit', exact: true });
      expect(screen.queryByText(/Preview TMDB sync/)).not.toBeInTheDocument();
      const label = getContentType(slug).label;
      fireEvent.click(button(isNew ? `+ New ${label}` : 'Edit'));
      await screen.findByRole('heading', { name: `${isNew ? 'New' : 'Edit'} ${label}` });
      if (isNew) {
        fireEvent.change(field('IMDb Title ID'), { target: { value: `  ${metadata.titleId}  ` } });
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
      expect(JSON.parse(options.body)).toMatchObject({
        titleId: metadata.titleId, title: metadata.title, plot: metadata.plot, director: metadata.director,
        mediaType: type === 'movie' ? 'movie' : 'tv', imageUrl: metadata.imageUrl, metadataSource: 'omdb',
      });
      if (!isNew) {
        expect(options.headers['If-Match']).toBe('"original-etag"');
        expect(JSON.parse(options.body)).toMatchObject({
          id: doc.id, order: doc.order, myRating: doc.myRating, review: doc.review, custom: doc.custom,
          tmdbId: doc.tmdbId, posterPath: doc.posterPath,
        });
      }
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Save', exact: true })).not.toBeInTheDocument());
      expect(fetch.mock.calls.every(([url]) => url.startsWith('/api/content-admin/'))).toBe(true);
    },
  );
});
