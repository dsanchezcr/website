import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchOmdbMetadata } from '../../admin/src/api';
import { normalizeImdbId } from '../../admin/src/omdb';

const metadata = {
  titleId: 'tt0111161', title: 'Example Movie', year: 1994, plot: 'An English plot.',
  director: 'Example Director', type: 'movie', imageUrl: 'https://example.org/poster.jpg',
  imdbRating: 8.7, genres: ['Drama'],
};
const respond = body => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body)));
  vi.stubGlobal('fetch', fetch);
  return fetch;
};

afterEach(() => vi.unstubAllGlobals());

describe('admin OMDb client', () => {
  it.each(['tt123456', 'tt123456789012', ' \t tt0111161 \n'])('accepts trimmed IMDb ID %j', async id => {
    const expectedId = id.trim();
    const fetch = respond({ ...metadata, titleId: expectedId });
    const controller = new AbortController();
    expect(await fetchOmdbMetadata(id, controller.signal)).toEqual({ ...metadata, titleId: expectedId });
    expect(fetch).toHaveBeenCalledExactlyOnceWith(`/api/content-admin/omdb?imdbId=${expectedId}`, {
      method: 'GET', headers: { accept: 'application/json' }, cache: 'no-store',
      credentials: 'same-origin', redirect: 'error', signal: controller.signal,
    });
  });

  it.each([
    '', '  ', 'tt12345', 'tt1234567890123', 'TT0111161', 'tt１２３４５６', 'tt123456x',
    'tt123456\nx', 'tt123456\n\0', 'prefix-tt123456', 'tt123456?apikey=x',
    'https://www.imdb.com/title/tt0111161/', 'tt123456/../../foo', null, 123456,
  ])('rejects invalid full-string input %j without a request', async id => {
    const fetch = respond(metadata);
    expect(normalizeImdbId(id)).toBeNull();
    await expect(fetchOmdbMetadata(id)).rejects.toThrow('tt followed by 6–12 digits');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('normalizes whitespace/N/A and ignores response extras without fetching a poster or provider', async () => {
    const fetch = respond({
      ...metadata, title: '  Example Movie  ', plot: ' N/A ', director: '  ',
      imageUrl: 'N/A', year: null, imdbRating: null, genres: [' Drama ', '', 'N/A'],
      providerSecret: 'do-not-copy', review: { en: 'do-not-copy' },
    });
    expect(await fetchOmdbMetadata(metadata.titleId)).toEqual({
      ...metadata, plot: null, director: null, imageUrl: null, year: null, imdbRating: null,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toMatch(/^\/api\/content-admin\/omdb\?/);
    expect(fetch.mock.calls[0][1]).not.toHaveProperty('body');
  });

  it.each([
    { titleId: 'tt9999999' }, { titleId: 'tt0111161\n' }, { title: 'N/A' }, { title: null },
    { title: '' }, { type: 'episode' }, { type: 'tv' }, { year: '1994–2000' }, { year: 1994.5 },
    { year: 0 }, { year: 10000 }, { plot: { en: 'Plot' } }, { director: [] }, { genres: 'Drama' },
    { genres: [1] }, { imdbRating: '8.7' }, { imdbRating: 11 }, { imdbRating: -1 },
    { imageUrl: 'javascript:alert(1)' }, { imageUrl: 'data:image/png;base64,test' },
    { imageUrl: 'http://example.org/poster.jpg' }, { imageUrl: '/poster.jpg' }, { imageUrl: '//example.org/poster.jpg' },
    { imageUrl: '******example.org/poster.jpg' },
    { imageUrl: 'https://example.org/<script>' },
  ])('rejects malformed metadata %j', async changes => {
    respond({ ...metadata, ...changes });
    await expect(fetchOmdbMetadata(metadata.titleId)).rejects.toThrow('Invalid metadata response');
  });

  it.each(Object.keys(metadata))('requires contract field %s', async key => {
    const body = { ...metadata };
    delete body[key];
    respond(body);
    await expect(fetchOmdbMetadata(metadata.titleId)).rejects.toThrow('Invalid metadata response');
  });

  it.each([null, [], true, 'secret provider text'])('rejects a non-object response %j', async body => {
    respond(body);
    await expect(fetchOmdbMetadata(metadata.titleId)).rejects.toThrow('Invalid metadata response');
  });

  it.each([
    [400, 'not an episode'], [401, 'Sign in again'], [403, 'admin role'], [404, 'Title not found'],
    [429, 'limit reached'], [502, 'temporarily unavailable'], [503, 'Contact the administrator'],
    [504, 'timed out'], [500, 'Unable to fetch metadata'],
  ])('reports safe actionable HTTP %s errors without exposing response bodies', async (status, expected) => {
    const json = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status, statusText: 'secret-provider-url-and-api-key', json,
    }));
    await expect(fetchOmdbMetadata(metadata.titleId)).rejects.toThrow(expected);
    expect(json).not.toHaveBeenCalled();
  });

  it('does not expose network or invalid JSON exception text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('secret provider URL')));
    await expect(fetchOmdbMetadata(metadata.titleId)).rejects.toThrow('Check your connection');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('secret invalid JSON')));
    await expect(fetchOmdbMetadata(metadata.titleId)).rejects.toThrow('Invalid metadata response');
  });

  it('honors cancellation before requesting and after a late response', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetch = respond(metadata);
    await expect(fetchOmdbMetadata(metadata.titleId, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch).not.toHaveBeenCalled();

    const pending = new AbortController();
    let finish;
    fetch.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const result = fetchOmdbMetadata(metadata.titleId, pending.signal);
    pending.abort();
    finish(new Response(JSON.stringify(metadata)));
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
});
