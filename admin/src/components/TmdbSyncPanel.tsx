import { useEffect, useRef, useState } from 'react';
import { syncTmdbContent, TmdbSyncError, type TmdbSyncRequest, type TmdbSyncResult } from '../api';

export default function TmdbSyncPanel({ onSynced }: { onSynced: () => Promise<void> }) {
  const [maxItems, setMaxItems] = useState('250');
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TmdbSyncResult | null>(null);
  const [wasDryRun, setWasDryRun] = useState(false);
  const [resumeRequest, setResumeRequest] = useState<TmdbSyncRequest | null>(null);
  const [batch, setBatch] = useState(0);
  const mounted = useRef(true);
  const onSyncedRef = useRef(onSynced);
  useEffect(() => { onSyncedRef.current = onSynced; }, [onSynced]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const runSync = async (resume = false) => {
    const limit = Number(maxItems);
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
      setError('Max items must be an integer between 1 and 1000.');
      return;
    }
    setLoading(true);
    setError(null);
    if (!resume) setResult(null);
    setResumeRequest(null);
    setBatch(0);
    let request: TmdbSyncRequest = resume && resumeRequest
      ? resumeRequest : { dryRun, maxItems: limit };
    const preview = request.dryRun !== false;
    setWasDryRun(preview);
    const warnings = new Set(resume ? result?.warnings : []);
    try {
      // Four feeds of at most 1,000 entries, processed in batches of 20.
      for (let i = 0; i < 201; i++) {
        setBatch(i + 1);
        const response = await syncTmdbContent(request);
        if (!mounted.current) return;
        response.warnings.forEach(warning => warnings.add(warning));
        setResult({ ...response, warnings: [...warnings] });
        if (response.completed) {
          if (!preview) await onSyncedRef.current();
          return;
        }
        if (!response.continuationToken || response.continuationToken === request.continuationToken) {
          throw new Error('TMDB sync made no progress. Start a new sync.');
        }
        request = { ...request, continuationToken: response.continuationToken };
      }
      throw new Error('TMDB sync exceeded the batch limit. Start a new sync.');
    } catch (e) {
      if (!mounted.current) return;
      if (e instanceof TmdbSyncError) {
        if (e.partialResult) {
          const partial = e.partialResult;
          partial.warnings.forEach(warning => warnings.add(warning));
          setResult(previous => ({
            ...(partial.continuationToken === null && previous ? previous : partial),
            warnings: [...warnings],
          }));
        }
        if (e.retryable) {
          setResumeRequest({ ...request, continuationToken: e.partialResult?.continuationToken ?? request.continuationToken });
        }
      } else if (e instanceof TypeError) {
        setResumeRequest(request);
      }
      setError(e instanceof Error ? e.message : 'TMDB sync failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="admin-sync-panel" aria-label="TMDB sync">
      <h3>TMDB connection</h3>
      <p>Sync the server-configured TMDB account's movie and TV watchlists and ratings.
        Newest additions appear first. Top Movies and Top TV Shows stay manually curated.</p>
      <p className="admin-muted">Account credentials are configured in server app settings, never in this browser.</p>
      <div className="admin-sync-controls">
        <label>Max items per list <input type="number" min="1" max="1000" value={maxItems}
          disabled={loading} onChange={e => { setMaxItems(e.target.value); setResumeRequest(null); }} /></label>
        <label><input type="checkbox" checked={dryRun} disabled={loading}
          onChange={e => { setDryRun(e.target.checked); setResumeRequest(null); }} /> Dry run (no database writes)</label>
        <button className="admin-btn admin-btn-primary" disabled={loading} onClick={() => runSync()}>
          {loading ? `Syncing batch ${batch}...` : dryRun ? 'Preview TMDB sync' : 'Sync TMDB'}
        </button>
        {resumeRequest && <button className="admin-btn" disabled={loading} onClick={() => runSync(true)}>Resume interrupted sync</button>}
      </div>
      {error && <div className="admin-error" role="alert">{error}</div>}
      <p className="admin-muted">Batches run automatically while this panel stays open. An interrupted sync may have saved earlier batches.
        Resume retries the acknowledged progress; changing options starts a new sync.</p>
      {result && <div role="status">
        <p><strong>{result.completed
          ? wasDryRun ? 'Preview complete (no writes)' : 'Sync complete'
          : wasDryRun ? 'Preview progress (no writes)' : 'Sync progress (not complete)'}:</strong> watchlist {result.watchlistImported},
          rated {result.recentlyImported}; movies {result.moviesUpdated}, series {result.seriesUpdated}.</p>
        <p>Created {result.created}, updated {result.replaced}, deleted {result.deleted}, unchanged {result.skipped}.</p>
        {result.warnings?.length > 0 && <ul>{result.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
      </div>}
    </section>
  );
}
