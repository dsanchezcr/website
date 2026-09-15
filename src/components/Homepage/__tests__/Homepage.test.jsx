import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { HomepageHeader } from '../index';

vi.mock('@site/src/components/WeatherWidget/CompactWeatherWidget', () => ({
  default: () => <div role="status">Weather forecast</div>,
}));

vi.mock('@site/src/hooks', () => ({
  useTypewriter: (text) => ({ displayText: text, isComplete: true }),
}));

describe('HomepageHeader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([
    ['en', 'Hi, I am', 'Software engineer', 'Welcome to my website'],
    ['es', 'Hola, soy', 'Ingeniero de software', 'Bienvenido a mi sitio web'],
    ['pt', 'Olá, sou', 'Engenheiro de software', 'Bem-vindo ao meu site'],
  ])('preserves the %s header and weather without visitor polling', async (_locale, greeting, subtitle, tagline) => {
    render(<HomepageHeader greeting={greeting} subtitle={subtitle} tagline={tagline} />);

    expect(screen.getByRole('heading', { name: `${greeting} David Sanchez.` })).toBeInTheDocument();
    expect(screen.getByLabelText(subtitle)).toBeInTheDocument();
    expect(screen.getByText(tagline)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'David Sanchez logo' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Weather forecast');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(301_000);
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByText(/visitors|visitantes/i)).not.toBeInTheDocument();
  });
});
