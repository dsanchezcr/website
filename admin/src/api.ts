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

export async function createDoc(type: string, doc: Doc): Promise<Doc> {
  const res = await fetch(`${BASE}/${type}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Doc;
}

export async function updateDoc(type: string, id: string, doc: Doc): Promise<Doc> {
  const res = await fetch(`${BASE}/${type}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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
