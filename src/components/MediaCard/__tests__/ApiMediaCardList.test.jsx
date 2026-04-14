import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ApiMediaCardList from '../ApiMediaCardList';

// Stub MediaCardList so we can assert on fetched items
vi.mock('../MediaCardList', () => ({
  default: ({ items }) => (
    <div data-testid="media-card-list">
      {items.map((item) => (
        <div key={item.titleId} data-testid="media-item">
          {item.titleId}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@site/src/config/environment', () => ({
  config: {
    getApiEndpoint: () => '',
    routes: {
      contentMovies: '/api/content/movies',
      contentSeries: '/api/content/series',
    },
  },
}));

describe('ApiMediaCardList', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows error for invalid contentType without fetching', () => {
    render(<ApiMediaCardList contentType="invalid" />);
    expect(screen.getByText(/Invalid content type/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows loading state while fetching', () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ApiMediaCardList contentType="movies" />);
    expect(screen.getByText(/loading content/i)).toBeInTheDocument();
  });

  it('renders MediaCardList with items on successful fetch', async () => {
    const items = [{ titleId: 'tt0000001' }, { titleId: 'tt0000002' }];
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => items,
    });

    render(<ApiMediaCardList contentType="movies" />);

    await waitFor(() => {
      expect(screen.getByTestId('media-card-list')).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('media-item')).toHaveLength(2);
  });

  it('renders series items using the series route', async () => {
    const items = [{ titleId: 'tt9999999' }];
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => items,
    });

    render(<ApiMediaCardList contentType="series" />);

    await waitFor(() => {
      expect(screen.getByTestId('media-card-list')).toBeInTheDocument();
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/content/series');
  });

  it('appends category query parameter when provided', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<ApiMediaCardList contentType="movies" category="action" />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('category=action');
  });

  it('shows error message on non-OK response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<ApiMediaCardList contentType="movies" />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load content/i)).toBeInTheDocument();
    });
  });

  it('suppresses AbortError and does not show error state', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    fetchMock.mockRejectedValue(abortError);

    render(<ApiMediaCardList contentType="movies" />);

    // Give React time to process the rejected promise
    await waitFor(() => {
      expect(screen.queryByText(/Error/i)).not.toBeInTheDocument();
    });
  });
});
