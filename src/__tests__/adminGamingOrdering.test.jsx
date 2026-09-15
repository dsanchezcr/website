import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ContentManager from '../../admin/src/components/ContentManager';
import { CONTENT_TYPES } from '../../admin/src/contentTypes';
import * as api from '../../admin/src/api';

vi.mock('../../admin/src/api', () => ({
  createDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  getPartitions: vi.fn(),
  getSample: vi.fn(),
  listDocs: vi.fn(),
  updateDoc: vi.fn(),
  generateLocalizedText: vi.fn(),
  refreshGamingProfiles: vi.fn(),
  syncTmdbContent: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  api.getPartitions.mockResolvedValue(['xbox']);
  api.listDocs.mockResolvedValue([]);
  api.createDoc.mockResolvedValue({});
  api.updateDoc.mockResolvedValue({});
});

it('creates a game without assigning a legacy integer or manual rank', async () => {
  render(<ContentManager type={CONTENT_TYPES.find(t => t.slug === 'gaming')} />);
  await screen.findByRole('option', { name: 'xbox' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Filter by platform' }), { target: { value: 'xbox' } });
  fireEvent.click(screen.getByRole('button', { name: '+ New Gaming' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  await waitFor(() => expect(api.createDoc).toHaveBeenCalledWith('gaming', { platform: 'xbox' }));
});

it('clears a manual rank without losing unknown fields or the original ETag', async () => {
  const doc = { id: 'game', platform: 'xbox', title: 'Example', manualOrder: 1, custom: 'keep',
    createdAt: '2026-09-15T00:00:00Z' };
  api.listDocs.mockResolvedValue([doc]);
  api.getDoc.mockResolvedValue({ doc, etag: '"original-etag"' });
  render(<ContentManager type={CONTENT_TYPES.find(t => t.slug === 'gaming')} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: 'Use automatic ordering' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  const { manualOrder, ...automatic } = doc;
  await waitFor(() => expect(api.updateDoc).toHaveBeenCalledWith('gaming', 'game', automatic, '"original-etag"'));
});
