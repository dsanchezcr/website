import { useState } from 'react';
import { refreshGamingProfiles, type GamingPlatform, type GamingRefreshResult } from '../api';

export default function GamingConnections() {
  const [busy, setBusy] = useState<GamingPlatform | 'all' | null>(null);
  const [result, setResult] = useState<GamingRefreshResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = async (platform: GamingPlatform | 'all') => {
    setBusy(platform);
    setError(null);
    setResult(null);
    try {
      setResult(await refreshGamingProfiles(platform));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gaming refresh failed.');
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="admin-sync-panel" aria-label="Gaming connections">
      <h3>Xbox and PlayStation connections</h3>
      <p>Fetch fresh profile and achievement data for the public widgets. This does not import or reorder curated game cards.</p>
      <p className="admin-muted">If credentials expire, update the Xbox settings or PSN_NPSSO_TOKEN on the server,
        then refresh here. A failed refresh keeps the last working profile.</p>
      <div className="admin-sync-controls">
        {(['xbox', 'playstation', 'all'] as const).map(platform => (
          <button key={platform} className="admin-btn" disabled={busy !== null} onClick={() => refresh(platform)}>
            {busy === platform ? 'Refreshing...' : `Refresh ${platform === 'all' ? 'both' : platform === 'xbox' ? 'Xbox' : 'PlayStation'}`}
          </button>
        ))}
      </div>
      {error && <div className="admin-error" role="alert">{error}</div>}
      {result && Object.entries(result.results).map(([platform, outcome]) => outcome && (
        <p key={platform} role={outcome.status === 'failed' ? 'alert' : 'status'}
          className={outcome.status === 'failed' ? 'admin-error' : undefined}>
          <strong>{platform === 'xbox' ? 'Xbox' : 'PlayStation'}:</strong> {outcome.message}
          {outcome.lastUpdated && ` Last updated: ${new Date(outcome.lastUpdated).toLocaleString()}`}
        </p>
      ))}
    </section>
  );
}
