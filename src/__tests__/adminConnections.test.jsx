import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import GamingConnections from '../../admin/src/components/GamingConnections';
import TmdbSyncPanel from '../../admin/src/components/TmdbSyncPanel';
import { refreshGamingProfiles, syncTmdbContent, TmdbSyncError } from '../../admin/src/api';

vi.mock('../../admin/src/api', async importOriginal => ({
  ...await importOriginal(),
  refreshGamingProfiles: vi.fn(),
  syncTmdbContent: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

const syncResult = (overrides = {}) => ({
  dryRun: true, completed: true, continuationToken: null,
  watchlistImported: 2, recentlyImported: 1, moviesUpdated: 2, seriesUpdated: 1,
  created: 3, replaced: 0, deleted: 0, skipped: 0, warnings: [], ...overrides,
});

describe('admin connection controls', () => {
  it('refreshes only the requested connection and reports a provider failure', async () => {
    refreshGamingProfiles.mockResolvedValue({
      platform: 'playstation',
      results: { playstation: { status: 'failed', message: 'Rotate the server token.', lastUpdated: null } },
    });
    render(<GamingConnections />);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh PlayStation' }));
    expect(refreshGamingProfiles).toHaveBeenCalledWith('playstation');
    expect(await screen.findByRole('alert')).toHaveTextContent('Rotate the server token.');
  });

  it('prevents duplicate refreshes while pending and reports network errors', async () => {
    let reject;
    refreshGamingProfiles.mockReturnValue(new Promise((_, fail) => { reject = fail; }));
    render(<GamingConnections />);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Xbox' }));
    expect(screen.getByRole('button', { name: 'Refresh both' })).toBeDisabled();
    reject(new Error('Connection unavailable'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection unavailable');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh Xbox' })).toBeEnabled());
  });

  it('previews TMDB sync without reloading or passing credentials', async () => {
    syncTmdbContent.mockImplementation(request => Promise.resolve(syncResult({ dryRun: request.dryRun })));
    const onSynced = vi.fn();
    render(<TmdbSyncPanel onSynced={onSynced} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview TMDB sync' }));
    expect(syncTmdbContent).toHaveBeenCalledWith({ dryRun: true, maxItems: 250 });
    expect(await screen.findByRole('status')).toHaveTextContent('no writes');
    expect(onSynced).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Sync TMDB' }));
    await waitFor(() => expect(onSynced).toHaveBeenCalledOnce());
  });

  it('validates sync limits without silently substituting a default', async () => {
    render(<TmdbSyncPanel onSynced={vi.fn()} />);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview TMDB sync' }));
    expect(screen.getByRole('alert')).toHaveTextContent('between 1 and 1000');
    expect(syncTmdbContent).not.toHaveBeenCalled();
  });

  it('follows continuation batches and displays cumulative counts only once', async () => {
    syncTmdbContent
      .mockResolvedValueOnce(syncResult({ completed: false, continuationToken: 'next', created: 20, warnings: ['Retained a manual entry.'] }))
      .mockResolvedValueOnce(syncResult({ created: 25 }));
    const onSynced = vi.fn();
    render(<TmdbSyncPanel onSynced={onSynced} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview TMDB sync' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Preview complete'));
    expect(syncTmdbContent).toHaveBeenNthCalledWith(2, { dryRun: true, maxItems: 250, continuationToken: 'next' });
    expect(screen.getByRole('status')).toHaveTextContent('Created 25');
    expect(screen.getByRole('status')).toHaveTextContent('Retained a manual entry.');
    expect(onSynced).not.toHaveBeenCalled();
  });

  it('keeps partial writes visible and resumes the returned cursor with unchanged options', async () => {
    syncTmdbContent
      .mockRejectedValueOnce(new TmdbSyncError('Storage stopped.', true,
        syncResult({ dryRun: false, completed: false, continuationToken: 'recovery', created: 7 })))
      .mockResolvedValueOnce(syncResult({ dryRun: false, created: 25 }));
    const onSynced = vi.fn();
    render(<TmdbSyncPanel onSynced={onSynced} />);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Sync TMDB' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage stopped.');
    expect(screen.getByRole('status')).toHaveTextContent('not complete');
    expect(screen.getByRole('status')).toHaveTextContent('Created 7');
    expect(onSynced).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Resume interrupted sync' }));
    await waitFor(() => expect(onSynced).toHaveBeenCalledOnce());
    expect(syncTmdbContent).toHaveBeenLastCalledWith({ dryRun: false, maxItems: 250, continuationToken: 'recovery' });
    expect(screen.getByRole('status')).toHaveTextContent('Created 25');
  });

  it('starts a fresh chain when switching from preview to persistence', async () => {
    syncTmdbContent
      .mockRejectedValueOnce(new TmdbSyncError('Timeout.', true,
        syncResult({ completed: false, continuationToken: 'preview-only' })))
      .mockResolvedValueOnce(syncResult({ dryRun: false }));
    render(<TmdbSyncPanel onSynced={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview TMDB sync' }));
    await screen.findByRole('button', { name: 'Resume interrupted sync' });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.queryByRole('button', { name: 'Resume interrupted sync' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sync TMDB' }));
    await waitFor(() => expect(syncTmdbContent).toHaveBeenLastCalledWith({ dryRun: false, maxItems: 250 }));
  });

  it('retains acknowledged progress when source validation fails before returning a cursor', async () => {
    syncTmdbContent
      .mockResolvedValueOnce(syncResult({ completed: false, continuationToken: 'next', created: 20 }))
      .mockRejectedValueOnce(new TmdbSyncError('Source timed out.', true,
        syncResult({ completed: false, continuationToken: null, created: 0 })))
      .mockResolvedValueOnce(syncResult({ created: 25 }));
    render(<TmdbSyncPanel onSynced={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview TMDB sync' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('status')).toHaveTextContent('Created 20');
    fireEvent.click(screen.getByRole('button', { name: 'Resume interrupted sync' }));
    await waitFor(() => expect(syncTmdbContent).toHaveBeenLastCalledWith({
      dryRun: true, maxItems: 250, continuationToken: 'next',
    }));
  });

  it('stops a continuation chain when the panel is closed', async () => {
    let finish;
    syncTmdbContent.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const { unmount } = render(<TmdbSyncPanel onSynced={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview TMDB sync' }));
    unmount();
    await act(async () => finish(syncResult({ completed: false, continuationToken: 'unused' })));
    expect(syncTmdbContent).toHaveBeenCalledOnce();
  });

  it('rejects repeated cursors instead of looping or claiming completion', async () => {
    syncTmdbContent.mockResolvedValue(syncResult({ completed: false, continuationToken: 'stuck' }));
    render(<TmdbSyncPanel onSynced={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview TMDB sync' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('made no progress');
    expect(syncTmdbContent).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).not.toHaveTextContent('Preview complete');
  });
});
