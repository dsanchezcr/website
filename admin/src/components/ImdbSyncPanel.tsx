import { useState } from 'react';
import type { ImdbSyncResult } from '../api';
import { syncImdbContent } from '../api';

export default function ImdbSyncPanel({ onSynced }: { onSynced: () => Promise<void> }) {
  const [watchlistUrl, setWatchlistUrl] = useState('');
  const [ratingsUrl, setRatingsUrl] = useState('');
  const [maxItems, setMaxItems] = useState<number>(250);
  const [dryRun, setDryRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImdbSyncResult | null>(null);

  const runSync = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await syncImdbContent({
        watchlistUrl: watchlistUrl.trim() || undefined,
        ratingsUrl: ratingsUrl.trim() || undefined,
        dryRun,
        maxItems,
      });

      setResult(response);
      if (!dryRun) {
        await onSynced();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid var(--admin-border)', borderRadius: '10px', padding: '0.85rem', marginBottom: '0.9rem', background: '#f9fbff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>IMDb Sync</h3>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--admin-muted)', fontSize: '0.83rem' }}>
            Sync Watchlist and Recently Watched/Completed from IMDb. Leave URLs empty to use server env vars.
          </p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={runSync} disabled={loading}>
          {loading ? 'Syncing…' : dryRun ? 'Run Dry Sync' : 'Sync IMDb'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '0.6rem', marginTop: '0.7rem' }}>
        <label className="admin-field" style={{ margin: 0 }}>
          <span>Watchlist URL (optional)</span>
          <input
            type="text"
            value={watchlistUrl}
            onChange={(e) => setWatchlistUrl(e.target.value)}
            placeholder="https://www.imdb.com/user/.../watchlist"
          />
        </label>

        <label className="admin-field" style={{ margin: 0 }}>
          <span>Ratings URL (optional)</span>
          <input
            type="text"
            value={ratingsUrl}
            onChange={(e) => setRatingsUrl(e.target.value)}
            placeholder="https://www.imdb.com/user/.../ratings"
          />
        </label>

        <label className="admin-field" style={{ margin: 0 }}>
          <span>Max Items</span>
          <input
            type="number"
            min={1}
            max={1000}
            value={maxItems}
            onChange={(e) => setMaxItems(Number(e.target.value) || 250)}
          />
        </label>
      </div>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.6rem', fontSize: '0.84rem' }}>
        <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
        Dry run (calculate only, do not write content)
      </label>

      {error && <div className="admin-error" style={{ marginTop: '0.6rem' }}>{error}</div>}

      {result && (
        <div style={{ marginTop: '0.7rem', fontSize: '0.84rem' }}>
          <div><strong>Imported:</strong> watchlist {result.watchlistImported}, recently {result.recentlyImported}</div>
          <div><strong>Affected:</strong> movies {result.moviesUpdated}, series {result.seriesUpdated}</div>
          <div><strong>Writes:</strong> created {result.created}, updated {result.replaced}, deleted {result.deleted}, unchanged {result.skipped}</div>
          {result.warnings?.length > 0 && (
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
              {result.warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
