import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import NotFoundGame from '../index';
import NotFoundContent from '../../../theme/NotFound/Content';
import { BEST_SCORE_KEY, SYMBOLS } from '../game';
import translations from '../translations';

const routing = vi.hoisted(() => ({ pathname: '/missing', locale: 'en' }));
vi.mock('@docusaurus/router', () => ({ useLocation: () => ({ pathname: routing.pathname }) }));
vi.mock('@docusaurus/useDocusaurusContext', () => ({
  default: () => ({ i18n: { currentLocale: routing.locale } }),
}));

const cards = () => within(screen.getByRole('group')).getAllByRole('button');
const choosePair = (index) => {
  fireEvent.click(cards()[index]);
  fireEvent.click(cards()[index + SYMBOLS.length]);
};
const finish = (from = 0) => {
  for (let index = from; index < SYMBOLS.length; index += 1) choosePair(index);
};
const stat = (label) => screen.getByText(label, { selector: 'dt' }).parentElement.querySelector('dd').textContent;
const start = () => fireEvent.click(screen.getByRole('button', { name: /Start game/ }));

beforeEach(() => {
  localStorage.clear();
  routing.pathname = '/missing';
  routing.locale = 'en';
  vi.spyOn(Math, 'random').mockReturnValue(0.999999);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('404 memory game experience', () => {
  it('renders a static error message and recovery links without browser storage or randomness', () => {
    const storage = vi.spyOn(Storage.prototype, 'getItem');
    const html = renderToString(<NotFoundGame />);
    expect(html).toContain('404 / PAGE NOT FOUND');
    expect(html).toContain('href="/"');
    expect(storage).not.toHaveBeenCalled();
    expect(Math.random).not.toHaveBeenCalled();
  });

  it('starts on demand, conceals answers, and focuses the first card', () => {
    render(<NotFoundGame />);
    expect(cards()).toHaveLength(12);
    for (const card of cards()) {
      expect(card).toBeDisabled();
      expect(card).toHaveAccessibleName(/face down/);
      expect(card).not.toHaveTextContent(/404|<\/>/);
    }
    start();
    expect(cards()[0]).toHaveFocus();
    expect(cards()[0]).not.toBeDisabled();
    fireEvent.click(cards()[0]);
    expect(cards()[0]).toHaveAccessibleName('Card 1: code tag');
    expect(stat('Moves')).toBe('0');
    expect(stat('Score')).toBe('0');
  });

  it('keeps mismatches readable until the next pick and counts a move only once', () => {
    render(<NotFoundGame />);
    start();
    fireEvent.click(cards()[0]);
    fireEvent.click(cards()[0]);
    expect(stat('Moves')).toBe('0');
    fireEvent.click(cards()[1]);
    expect(screen.getByRole('status')).toHaveTextContent('Not a match');
    expect(cards()[0]).toHaveAccessibleName('Card 1: code tag');
    expect(cards()[1]).toHaveAccessibleName('Card 2: braces');
    fireEvent.click(cards()[2]);
    expect(cards()[0]).toHaveAccessibleName('Card 1: face down');
    expect(cards()[1]).toHaveAccessibleName('Card 2: face down');
    expect(cards()[2]).toHaveAccessibleName('Card 3: brackets');
    expect(stat('Moves')).toBe('1');
  });

  it('finishes, saves the best, focuses replay, and resets the next round', () => {
    const { unmount } = render(<NotFoundGame />);
    start();
    choosePair(0);
    expect(cards()[0]).toHaveAttribute('aria-disabled', 'true');
    expect(cards()[0]).toHaveAttribute('tabindex', '-1');
    fireEvent.click(cards()[0]);
    expect(stat('Score')).toBe('100');
    expect(localStorage.getItem(BEST_SCORE_KEY)).toBeNull();
    finish(1);
    expect(stat('Score')).toBe('975');
    expect(stat('Moves')).toBe('6');
    expect(stat('Pairs')).toBe('6 / 6');
    expect(stat('Personal best')).toBe('975');
    expect(localStorage.getItem(BEST_SCORE_KEY)).toBe('975');
    expect(screen.getByRole('status')).toHaveTextContent('Reboot complete! 975 points in 6 moves.');
    const replay = screen.getByRole('button', { name: /Play again/ });
    expect(replay).toHaveFocus();
    fireEvent.click(replay);
    expect(cards()[0]).toHaveFocus();
    expect(stat('Score')).toBe('0');
    expect(stat('Moves')).toBe('0');
    expect(stat('Pairs')).toBe('0 / 6');
    expect(stat('Personal best')).toBe('975');
    unmount();
    render(<NotFoundGame />);
    expect(stat('Personal best')).toBe('975');
  });

  it('does not overwrite a higher best with a lower completed score', () => {
    localStorage.setItem(BEST_SCORE_KEY, '975');
    render(<NotFoundGame />);
    start();
    choosePair(0);
    fireEvent.click(cards()[1]);
    fireEvent.click(cards()[2]);
    finish(1);
    expect(stat('Score')).toBe('850');
    expect(stat('Moves')).toBe('7');
    expect(stat('Personal best')).toBe('975');
    expect(localStorage.getItem(BEST_SCORE_KEY)).toBe('975');
  });

  it('rereads storage at completion to preserve a newer best from another tab', () => {
    render(<NotFoundGame />);
    start();
    choosePair(0);
    fireEvent.click(cards()[1]);
    fireEvent.click(cards()[2]);
    localStorage.setItem(BEST_SCORE_KEY, '975');
    finish(1);
    expect(stat('Personal best')).toBe('975');
    expect(localStorage.getItem(BEST_SCORE_KEY)).toBe('975');
  });

  it('restarts an unfinished game without saving it', () => {
    render(<NotFoundGame />);
    start();
    choosePair(0);
    fireEvent.click(cards()[1]);
    fireEvent.click(cards()[2]);
    fireEvent.click(screen.getByRole('button', { name: /Restart/ }));
    expect(stat('Moves')).toBe('0');
    expect(stat('Score')).toBe('0');
    expect(cards()[0]).toHaveFocus();
    expect(localStorage.getItem(BEST_SCORE_KEY)).toBeNull();
  });

  it('shows invalid storage explicitly and replaces it on completion', () => {
    localStorage.setItem(BEST_SCORE_KEY, '99999999');
    render(<NotFoundGame />);
    expect(screen.getByText(translations.en.invalid)).toBeInTheDocument();
    expect(stat('Personal best')).toBe('0');
    start();
    finish();
    expect(localStorage.getItem(BEST_SCORE_KEY)).toBe('975');
    expect(screen.queryByText(translations.en.invalid)).not.toBeInTheDocument();
  });

  it.each(['getItem', 'setItem'])('keeps the game playable when storage %s throws', (method) => {
    vi.spyOn(Storage.prototype, method).mockImplementation(() => { throw new DOMException('Denied'); });
    render(<NotFoundGame />);
    start();
    finish();
    expect(stat('Score')).toBe('975');
    expect(stat('Personal best')).toBe('975');
    expect(screen.getByText(translations.en.unavailable)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Play again/ }));
    expect(stat('Personal best')).toBe('975');
  });

  it.each(['en', 'es', 'pt'])('localizes all game states, card names and navigation in %s', (locale) => {
    const text = translations[locale];
    render(<NotFoundGame locale={locale} />);
    expect(screen.getByRole('main')).toHaveAttribute('lang', locale);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(text.title);
    expect(screen.getByRole('link', { name: text.home })).toHaveAttribute('href', locale === 'en' ? '/' : `/${locale}/`);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(text.start) }));
    expect(cards()[0]).toHaveAccessibleName(text.card(1, null, false));
    choosePair(0);
    expect(screen.getByRole('status')).toHaveTextContent(text.match(100, 1));
    expect(cards()[0]).toHaveAccessibleName(text.card(1, text.symbols['</>'], true));
    finish(1);
    expect(screen.getByRole('status')).toHaveTextContent(text.won(975, 6));
    expect(screen.getByRole('button', { name: new RegExp(text.replay) })).toBeInTheDocument();
  });
});

describe('Docusaurus not-found integration', () => {
  it.each(['es', 'pt'])('uses the %s URL locale when SWA delivers the English fallback', (locale) => {
    routing.pathname = `/${locale}/a-missing-page`;
    render(<NotFoundContent />);
    expect(screen.getByRole('main')).toHaveAttribute('lang', locale);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(translations[locale].title);
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  });

  it('does not mistake a longer path segment for a locale', () => {
    routing.pathname = '/escape/missing';
    render(<NotFoundContent />);
    expect(screen.getByRole('main')).toHaveAttribute('lang', 'en');
  });

  it('uses the build locale during static rendering and for localized 404 documents', () => {
    routing.locale = 'pt';
    routing.pathname = '/pt/404.html';
    const html = renderToString(<NotFoundContent />);
    expect(html).toContain(translations.pt.title);
    render(<NotFoundContent />);
    expect(screen.getByRole('main')).toHaveAttribute('lang', 'pt');
  });
});
