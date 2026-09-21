import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshGamingProfiles } from '../../admin/src/api';

afterEach(() => vi.unstubAllGlobals());

describe('admin gaming API contracts', () => {
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

});
