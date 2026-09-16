import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GamingConnections from '../../admin/src/components/GamingConnections';
import { refreshGamingProfiles } from '../../admin/src/api';

vi.mock('../../admin/src/api', async importOriginal => ({
  ...await importOriginal(),
  refreshGamingProfiles: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

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

});
