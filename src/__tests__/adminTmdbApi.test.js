import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchTmdbMetadata } from '../../admin/src/api';
import { normalizeTmdbId } from '../../admin/src/tmdb';

const metadata = {
  tmdbId: 550, mediaType: 'movie', titleId: 'tt0111161', title: 'Example Movie',
  year: 1994, plot: 'English plot', director: 'Director', posterPath: '/poster.jpg',
  imageUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg', tmdbRating: 8.7, genres: ['Drama'],
  titleTranslations: { en: 'Example Movie', es: 'Película', pt: 'Filme' },
  overview: { en: 'English plot', es: '', pt: '' }, genresTranslations: { en: ['Drama'], es: [], pt: [] },
};
const respond = body => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body)));
  vi.stubGlobal('fetch', fetch);
  return fetch;
};
afterEach(() => vi.unstubAllGlobals());

describe('admin TMDB client', () => {
  it.each([1, 2147483647, ' 550 '])('accepts TMDB ID %j and calls only the admin proxy', async value => {
    const id = Number(value);
    const fetch = respond({ ...metadata, tmdbId: id });
    const controller = new AbortController();
    expect(await fetchTmdbMetadata(value, 'movie', controller.signal)).toEqual({ ...metadata, tmdbId: id });
    expect(fetch).toHaveBeenCalledExactlyOnceWith(`/api/content-admin/tmdb?tmdbId=${id}&mediaType=movie`, {
      method: 'GET', headers: { accept: 'application/json' }, cache: 'no-store',
      credentials: 'same-origin', redirect: 'error', signal: controller.signal,
    });
  });
  it.each(['', ' ', 0, -1, 1.5, 2147483648, '５５０', 'tt0111161', '550x', '1e3',
    '550\nx', '550\0', '550?apikey=x', 'https://www.themoviedb.org/movie/550', null, {}, NaN])(
    'rejects invalid IDs %j without a request', async id => {
      const fetch = respond(metadata);
      expect(normalizeTmdbId(id)).toBeNull();
      await expect(fetchTmdbMetadata(id, 'movie')).rejects.toThrow('positive TMDB ID');
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each(['series', 'episode', 'MOVIE', undefined])('rejects invalid media type %j', async type => {
    const fetch = respond(metadata);
    await expect(fetchTmdbMetadata(550, type)).rejects.toThrow('Movies or Series');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('ignores response extras and does not fetch poster binaries', async () => {
    const fetch = respond({ ...metadata, providerSecret: 'do-not-copy', review: { en: 'do-not-copy' } });
    expect(await fetchTmdbMetadata(550, 'movie')).toEqual(metadata);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([
    { tmdbId: 551 }, { tmdbId: '550' }, { mediaType: 'tv' }, { title: '' }, { title: null },
    { titleId: 'tt0111161\n' }, { titleId: 'bad-id' }, { year: '1994' }, { year: 1.5 }, { year: 0 }, { year: 10000 },
    { plot: {} }, { director: [] }, { tmdbRating: '8.7' }, { tmdbRating: 11 }, { tmdbRating: -1 },
    { genres: 'Drama' }, { genres: [1] }, { titleTranslations: { en: 'Title' } },
    { overview: { en: '', es: null, pt: '' } }, { genresTranslations: { en: [], es: 'Drama', pt: [] } },
    { posterPath: '/poster.jpg\n' }, { posterPath: 'https://evil.test/poster.jpg' },
    { posterPath: '/../poster.jpg' }, { imageUrl: 'https://evil.test/poster.jpg' },
    { imageUrl: 'javascript:alert(1)' }, { imageUrl: null },
  ])('rejects malformed metadata %j atomically', async changes => {
    respond({ ...metadata, ...changes });
    await expect(fetchTmdbMetadata(550, 'movie')).rejects.toThrow('Invalid metadata response');
  });
  it.each(Object.keys(metadata))('requires contract field %s', async key => {
    const body = { ...metadata };
    delete body[key];
    respond(body);
    await expect(fetchTmdbMetadata(550, 'movie')).rejects.toThrow('Invalid metadata response');
  });
  it.each([null, [], true, 'private text'])('rejects non-object payload %j', async body => {
    respond(body);
    await expect(fetchTmdbMetadata(550, 'movie')).rejects.toThrow('Invalid metadata response');
  });
  it.each([
    [400, 'not an episode'], [401, 'Sign in again'], [403, 'admin role'], [404, 'Title not found'],
    [429, 'limit reached'], [502, 'temporarily unavailable'], [503, 'Contact the administrator'],
    [504, 'timed out'], [500, 'Unable to fetch metadata'],
  ])('reports safe HTTP %s errors without reading provider bodies', async (status, expected) => {
    const json = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status, statusText: 'private token', json }));
    await expect(fetchTmdbMetadata(550, 'movie')).rejects.toThrow(expected);
    expect(json).not.toHaveBeenCalled();
  });
  it('sanitizes network and JSON exceptions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private token')));
    await expect(fetchTmdbMetadata(550, 'movie')).rejects.toThrow('Check your connection');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('invalid private JSON')));
    await expect(fetchTmdbMetadata(550, 'movie')).rejects.toThrow('Invalid metadata response');
  });
  it('honors cancellation before fetch and after a late response', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetch = respond(metadata);
    await expect(fetchTmdbMetadata(550, 'movie', controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch).not.toHaveBeenCalled();
    const pending = new AbortController();
    let finish;
    fetch.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const result = fetchTmdbMetadata(550, 'movie', pending.signal);
    pending.abort();
    finish(new Response(JSON.stringify(metadata)));
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
});
