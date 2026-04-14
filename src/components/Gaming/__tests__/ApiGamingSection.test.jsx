import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ApiGamingSection from '../ApiGamingSection';

// Stub GamingEntriesRenderer so we can assert on fetched items
vi.mock('../GamingEntriesRenderer', () => ({
  default: ({ items }) => (
    <div data-testid="gaming-entries">
      {items.map((item, i) => (
        <div key={item.id || i} data-testid="gaming-item">
          {item.title}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@site/src/config/environment', () => ({
  config: {
    getApiEndpoint: () => '',
    routes: {
      contentGaming: '/api/content/gaming',
    },
  },
}));

describe('ApiGamingSection', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows loading state while fetching', () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ApiGamingSection platform="xbox" />);
    expect(screen.getByText(/loading games/i)).toBeInTheDocument();
  });

  it('renders GamingEntriesRenderer with items on successful fetch', async () => {
    const items = [
      { id: 'g1', title: 'Halo Infinite' },
      { id: 'g2', title: 'Forza Horizon' },
    ];
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => items,
    });

    render(<ApiGamingSection platform="xbox" />);

    await waitFor(() => {
      expect(screen.getByTestId('gaming-entries')).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('gaming-item')).toHaveLength(2);
    expect(screen.getByText('Halo Infinite')).toBeInTheDocument();
  });

  it('constructs request URL with platform query parameter', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<ApiGamingSection platform="playstation" />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/content/gaming');
    expect(url).toContain('platform=playstation');
  });

  it('appends section query parameter when provided', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<ApiGamingSection platform="xbox" section="topGames" />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('section=topGames');
  });

  it('applies client-side filter via prop without re-fetching', async () => {
    const items = [
      { id: 'g1', title: 'Completed Game', status: 'completed' },
      { id: 'g2', title: 'Backlog Game', status: 'backlog' },
    ];
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => items,
    });

    // Only render completed games
    const filter = (item) => item.status === 'completed';
    render(<ApiGamingSection platform="xbox" filter={filter} />);

    await waitFor(() => {
      expect(screen.getByTestId('gaming-entries')).toBeInTheDocument();
    });

    expect(screen.getByText('Completed Game')).toBeInTheDocument();
    expect(screen.queryByText('Backlog Game')).not.toBeInTheDocument();
    // Fetch should only have been called once despite filter prop
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows error message on non-OK response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
    });

    render(<ApiGamingSection platform="xbox" />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load gaming content/i)).toBeInTheDocument();
    });
  });

  it('suppresses AbortError and does not show error state', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    fetchMock.mockRejectedValue(abortError);

    render(<ApiGamingSection platform="xbox" />);

    await waitFor(() => {
      expect(screen.queryByText(/Error/i)).not.toBeInTheDocument();
    });
  });
});
