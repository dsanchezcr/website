import type { ClientPrincipal, Doc } from './types';

const BASE = '/api/content-admin';

interface ApiErrorBody {
  error?: string;
  details?: string[];
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    const detail = body.details?.length ? `: ${body.details.join('; ')}` : '';
    return `${body.error || res.statusText}${detail}`;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

/** Returns the signed-in user (with roles), or null when not authenticated. */
export async function getMe(): Promise<ClientPrincipal | null> {
  try {
    const res = await fetch('/.auth/me', { headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as { clientPrincipal?: ClientPrincipal | null };
    return data?.clientPrincipal ?? null;
  } catch {
    return null;
  }
}

export async function listDocs(type: string, pk?: string): Promise<Doc[]> {
  const url = pk ? `${BASE}/${type}?pk=${encodeURIComponent(pk)}` : `${BASE}/${type}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Doc[];
}

export async function getPartitions(type: string): Promise<string[]> {
  const res = await fetch(`${BASE}/${type}?meta=partitions`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as string[];
}

export async function getSample(type: string): Promise<Doc | null> {
  const res = await fetch(`${BASE}/${type}?meta=sample`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Doc | null;
}

export interface DocWithEtag {
  doc: Doc;
  etag: string | null;
}

/** Fetch a single document plus its ETag, so updates can use optimistic concurrency (If-Match). */
export async function getDoc(type: string, id: string, pk: string): Promise<DocWithEtag> {
  const res = await fetch(`${BASE}/${type}/${encodeURIComponent(id)}?pk=${encodeURIComponent(pk)}`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(await parseError(res));
  const doc = (await res.json()) as Doc;
  return { doc, etag: res.headers.get('ETag') };
}

export async function createDoc(type: string, doc: Doc): Promise<Doc> {
  const res = await fetch(`${BASE}/${type}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Doc;
}

export async function updateDoc(type: string, id: string, doc: Doc, etag?: string | null): Promise<Doc> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Optimistic concurrency: only overwrite if the document hasn't changed since it was loaded.
  if (etag) headers['If-Match'] = etag;
  const res = await fetch(`${BASE}/${type}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(doc),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Doc;
}

export async function deleteDoc(type: string, id: string, pk: string): Promise<void> {
  const res = await fetch(`${BASE}/${type}/${encodeURIComponent(id)}?pk=${encodeURIComponent(pk)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await parseError(res));
}

/** Localized text produced by the AI generator, one string per supported locale. */
export interface LocalizedText {
  en: string;
  es: string;
  pt: string;
}

export interface TmdbSyncRequest {
  dryRun?: boolean;
  maxItems?: number;
  continuationToken?: string | null;
}

export interface TmdbSyncResult {
  dryRun: boolean;
  completed: boolean;
  continuationToken: string | null;
  watchlistImported: number;
  recentlyImported: number;
  moviesUpdated: number;
  seriesUpdated: number;
  created: number;
  replaced: number;
  deleted: number;
  skipped: number;
  warnings: string[];
}

export class TmdbSyncError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    public readonly partialResult?: TmdbSyncResult,
  ) {
    super(message);
    this.name = 'TmdbSyncError';
  }
}

function isTmdbSyncResult(value: unknown): value is TmdbSyncResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  return typeof result.dryRun === 'boolean' && typeof result.completed === 'boolean' &&
    (result.continuationToken === null || typeof result.continuationToken === 'string') &&
    (!result.completed || result.continuationToken === null) &&
    ['watchlistImported', 'recentlyImported', 'moviesUpdated', 'seriesUpdated',
      'created', 'replaced', 'deleted', 'skipped'].every(key =>
      typeof result[key] === 'number' && Number.isSafeInteger(result[key]) && result[key] >= 0) &&
    Array.isArray(result.warnings) && result.warnings.every(warning => typeof warning === 'string');
}

/**
 * Expand a brief prompt into localized (en/es/pt) content for a field, using the admin-only
 * Foundry endpoint. `type` is the content-type slug; `field` is the logical field name
 * (review | description | recommendation | name | title | introText).
 */
export async function generateLocalizedText(
  type: string,
  field: string,
  prompt: string,
  title?: string,
): Promise<LocalizedText> {
  const res = await fetch(`${BASE}/ai/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType: type, field, prompt, title }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as LocalizedText;
}

/**
 * Uses only the TMDB account configured on the server. Credentials never enter the browser.
 */
export async function syncTmdbContent(payload: TmdbSyncRequest): Promise<TmdbSyncResult> {
  const res = await fetch(`${BASE}/tmdb/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Invalid TMDB sync response (HTTP ${res.status}).`);
  }
  if (!res.ok) {
    const error = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    throw new TmdbSyncError(
      typeof error.error === 'string' ? error.error : `TMDB sync failed (HTTP ${res.status}).`,
      error.retryable === true && (res.status === 500 || res.status === 504),
      isTmdbSyncResult(error.partialResult) ? error.partialResult : undefined,
    );
  }
  if (!isTmdbSyncResult(body) || body.dryRun !== (payload.dryRun ?? true) || (!body.completed && !body.continuationToken)) {
    throw new Error('Invalid TMDB sync progress response.');
  }
  return body;
}

export type GamingPlatform = 'xbox' | 'playstation';
export interface GamingRefreshResult {
  platform: GamingPlatform | 'all';
  results: Partial<Record<GamingPlatform, {
    status: 'refreshed' | 'failed';
    message: string;
    lastUpdated: string | null;
  }>>;
}

export async function refreshGamingProfiles(platform: GamingPlatform | 'all'): Promise<GamingRefreshResult> {
  const res = await fetch('/api/gaming/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform }),
  });
  // A provider failure includes per-connection outcomes so partial success stays visible.
  if (!res.ok && res.status !== 502) throw new Error(await parseError(res));
  const body = await res.json() as GamingRefreshResult;
  if (!body.results || Object.keys(body.results).length === 0) throw new Error('Invalid gaming refresh response.');
  return body;
}
