import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshGamingProfiles, syncTmdbContent, TmdbSyncError } from '../../admin/src/api';

afterEach(() => vi.unstubAllGlobals());

describe('admin sync API contracts', () => {
  it('posts only platform selection and preserves structured provider failures', async () => {
    const payload = { platform: 'xbox', results: { xbox: { status: 'failed', message: 'Unavailable', lastUpdated: null } } };
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 502 }));
    vi.stubGlobal('fetch', fetch);
    expect(await refreshGamingProfiles('xbox')).toEqual(payload);
    expect(fetch).toHaveBeenCalledWith('/api/gaming/refresh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"platform":"xbox"}',
    });
  });

  it('surfaces auth errors and rejects empty gateway failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"Admin role required."}', { status: 403 })));
    await expect(refreshGamingProfiles('all')).rejects.toThrow('Admin role required.');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 502 })));
    await expect(refreshGamingProfiles('all')).rejects.toThrow('Invalid gaming refresh response.');
  });

  it('uses the configured TMDB endpoint and reports configuration errors', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"error":"TMDB is not configured."}', { status: 503 }));
    vi.stubGlobal('fetch', fetch);
    await expect(syncTmdbContent({ dryRun: true, maxItems: 250 })).rejects.toThrow('TMDB is not configured.');
    expect(fetch).toHaveBeenCalledWith('/api/content-admin/tmdb/sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"dryRun":true,"maxItems":250}',
    });
  });

  it('preserves retryable TMDB partial progress on gateway timeouts', async () => {
    const partialResult = {
      dryRun: false, completed: false, continuationToken: 'resume-token', watchlistImported: 25,
      recentlyImported: 0, moviesUpdated: 7, seriesUpdated: 0, created: 7, replaced: 0,
      deleted: 0, skipped: 0, warnings: ['Partial writes remain.'],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'Storage timed out.', retryable: true, phase: 'storage', partialResult,
    }), { status: 504 })));
    await expect(syncTmdbContent({ dryRun: false, continuationToken: 'previous' })).rejects.toMatchObject({
      name: 'TmdbSyncError', retryable: true, partialResult,
    });
  });

  it('rejects incomplete success-shaped TMDB responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"completed":true}')));
    await expect(syncTmdbContent({ dryRun: true })).rejects.toThrow('Invalid TMDB sync progress response.');
  });

  it('does not treat source conflicts as resumable failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"Source changed; restart."}', { status: 409 })));
    await expect(syncTmdbContent({ continuationToken: 'old' })).rejects.toEqual(
      new TmdbSyncError('Source changed; restart.', false));
  });
});
