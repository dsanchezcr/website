/**
 * Hook for fetching IMDB title data with localStorage caching and fallback.
 * Uses https://imdbapi.dev/ API with batch fetching (max 5 per request).
 * Falls back to cached data when the API is unavailable.
 */
import { useState, useEffect, useMemo } from 'react';

const CACHE_PREFIX = 'imdb_title_';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const API_BASE = 'https://api.imdbapi.dev';

function getCachedTitle(titleId) {
  if (typeof window === 'undefined') return { data: null, isExpired: true };
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${titleId}`);
    if (raw) {
      const { data, timestamp } = JSON.parse(raw);
      return { data, isExpired: Date.now() - timestamp > CACHE_TTL };
    }
  } catch { /* ignore */ }
  return { data: null, isExpired: true };
}

function setCachedTitle(titleId, data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${CACHE_PREFIX}${titleId}`, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch { /* ignore quota errors */ }
}

async function fetchTitlesBatch(titleIds) {
  const params = new URLSearchParams();
  titleIds.forEach(id => params.append('titleIds', id));
  const res = await fetch(`${API_BASE}/titles:batchGet?${params}`);
  if (!res.ok) throw new Error(`IMDB API error: ${res.status}`);
  const result = await res.json();
  return result.titles || [];
}

/**
 * Fetches IMDB data for an array of title items.
 * Each item should have { titleId, myRating, review, category }.
 * Returns enriched items with { ...item, imdb, loading, error }.
 *
 * @param {Array<{titleId: string, myRating: number|null, review: string, category: string}>} items
 * @returns {Array<{titleId: string, myRating: number|null, review: string, category: string, imdb: object|null, loading: boolean, error: string|null}>}
 */
export function useImdbData(items) {
  const titleIdsKey = useMemo(() => items.map(i => i.titleId).join(','), [items]);

  const [data, setData] = useState(() =>
    items.map(item => ({
      ...item,
      imdb: null,
      loading: true,
      error: null,
    }))
  );
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    setRetryCount(0);
  }, [titleIdsKey]);

  useEffect(() => {
    if (!items.length) return;

    let cancelled = false;
    let retryTimer = null;
    const cachedResults = {};
    const toFetch = [];

    items.forEach(item => {
      const { data: cached, isExpired } = getCachedTitle(item.titleId);
      if (cached) {
        cachedResults[item.titleId] = cached;
        if (isExpired) toFetch.push(item.titleId);
      } else {
        toFetch.push(item.titleId);
      }
    });

    // Show cached data immediately
    if (!cancelled) {
      setData(items.map(item => ({
        ...item,
        imdb: cachedResults[item.titleId] || null,
        loading: toFetch.includes(item.titleId),
        error: null,
      })));
    }

    if (toFetch.length === 0) return;

    // Fetch in batches of 5 (API limit)
    const fetchAll = async () => {
      const fetched = {};
      const failedIds = [];
      for (let i = 0; i < toFetch.length; i += 5) {
        const batch = toFetch.slice(i, i + 5);
        try {
          const results = await fetchTitlesBatch(batch);
          results.forEach(title => {
            fetched[title.id] = title;
            setCachedTitle(title.id, title);
          });
        } catch {
          // Batch failed — use stale cached data as fallback
          batch.forEach(id => {
            if (cachedResults[id]) fetched[id] = cachedResults[id];
            else failedIds.push(id);
          });
        }
      }

      if (!cancelled) {
        setData(items.map(item => ({
          ...item,
          imdb: fetched[item.titleId] || cachedResults[item.titleId] || null,
          loading: false,
          error: !fetched[item.titleId] && !cachedResults[item.titleId]
            ? 'Failed to load title data'
            : null,
        })));

        // Schedule auto-retry if there are failed items without cache
        if (failedIds.length > 0 && retryCount < MAX_RETRIES) {
          const delay = Math.min(3000 * Math.pow(2, retryCount), 24000);
          retryTimer = setTimeout(() => {
            if (!cancelled) setRetryCount(prev => prev + 1);
          }, delay);
        }
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [titleIdsKey, retryCount]);

  return data;
}
