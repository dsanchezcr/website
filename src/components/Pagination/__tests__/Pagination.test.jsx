import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from '../index';

describe('Pagination', () => {
  it('renders nothing when totalPages is 1 or less', () => {
    const { container: c1 } = render(<Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />);
    expect(c1.firstChild).toBeNull();

    const { container: c0 } = render(<Pagination currentPage={1} totalPages={0} onPageChange={() => {}} />);
    expect(c0.firstChild).toBeNull();
  });

  it('renders pagination controls when totalPages > 1 in English', () => {
    render(<Pagination currentPage={1} totalPages={3} onPageChange={() => {}} locale="en" />);
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled();
  });

  it('translates text to Spanish and Portuguese', () => {
    const { rerender } = render(<Pagination currentPage={2} totalPages={3} onPageChange={() => {}} locale="es" />);
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).not.toBeDisabled();

    rerender(<Pagination currentPage={3} totalPages={3} onPageChange={() => {}} locale="pt" />);
    expect(screen.getByText('Página 3 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próximo' })).toBeDisabled();
  });

  it('calls onPageChange with correct page numbers when buttons clicked', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} locale="en" />);

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
