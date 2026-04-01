import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import GameCard from '../GameCard';

describe('GameCard', () => {
  const defaultProps = {
    title: 'Halo Infinite',
    platform: 'xbox',
    status: 'completed',
    imageUrl: '/img/gaming/xbox/halo-infinite.jpg',
  };

  it('renders the game title', () => {
    render(<GameCard {...defaultProps} />);
    expect(screen.getByText('Halo Infinite')).toBeInTheDocument();
  });

  it('renders the platform badge', () => {
    render(<GameCard {...defaultProps} />);
    expect(screen.getByText('Xbox')).toBeInTheDocument();
  });

  it('renders the status label', () => {
    render(<GameCard {...defaultProps} />);
    // English locale default: "✅ Completed"
    expect(screen.getByText('✅ Completed')).toBeInTheDocument();
  });

  it('renders the game image with alt text', () => {
    render(<GameCard {...defaultProps} />);
    const img = screen.getByAltText('Halo Infinite');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/img/gaming/xbox/halo-infinite.jpg');
  });

  it('renders recommendation text when provided', () => {
    render(<GameCard {...defaultProps} recommendation="Great game!" />);
    expect(screen.getByText('Great game!')).toBeInTheDocument();
  });

  it('renders description over recommendation when both provided', () => {
    render(
      <GameCard {...defaultProps} description="A description" recommendation="A recommendation" />
    );
    expect(screen.getByText('A description')).toBeInTheDocument();
  });

  it('renders hours played when provided', () => {
    render(<GameCard {...defaultProps} hoursPlayed={42} />);
    expect(screen.getByText('🕐 42h played')).toBeInTheDocument();
  });

  it('wraps in a link when url is provided', () => {
    render(<GameCard {...defaultProps} url="https://example.com" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not wrap in a link when url is not provided', () => {
    render(<GameCard {...defaultProps} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders co-op badge when coOp is true', () => {
    render(<GameCard {...defaultProps} coOp={true} />);
    expect(screen.getByText('Co-Op')).toBeInTheDocument();
  });

  it('renders online badge when online is true', () => {
    render(<GameCard {...defaultProps} online={true} />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('applies platform color to badge', () => {
    render(<GameCard {...defaultProps} />);
    const badge = screen.getByText('Xbox');
    expect(badge).toHaveStyle({ backgroundColor: '#107C10' });
  });
});
