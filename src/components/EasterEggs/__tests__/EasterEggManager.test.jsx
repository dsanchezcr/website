import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import EasterEggManager from '../EasterEggManager';
import easterEggConfig from '../easterEggConfig';

// Mock all egg components to simple divs
vi.mock('../KonamiSpaceShooter', () => ({ default: ({ onClose }) => <div data-testid="konami" onClick={onClose} /> }));
vi.mock('../SecretTerminal', () => ({ default: ({ onClose }) => <div data-testid="terminal" onClick={onClose} /> }));
vi.mock('../MatrixRain', () => ({ default: ({ onClose }) => <div data-testid="matrix" onClick={onClose} /> }));
vi.mock('../ClippyAssistant', () => ({ default: ({ onClose }) => <div data-testid="clippy" onClick={onClose} /> }));
vi.mock('../BirthdayEgg', () => ({ default: () => <div data-testid="birthday" /> }));
vi.mock('../FlappyBird', () => ({ default: ({ onClose }) => <div data-testid="flappy" onClick={onClose} /> }));
vi.mock('../SnakeGame', () => ({ default: ({ onClose }) => <div data-testid="snake" onClick={onClose} /> }));
vi.mock('../DogOnCursor', () => ({ default: ({ onClose }) => <div data-testid="dog" onClick={onClose} /> }));
vi.mock('../CostaRicaConfetti', () => ({ default: () => null }));

// Save original config
const originalConfig = { ...easterEggConfig };

function typeKeys(keys) {
  keys.forEach((key) => {
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    });
  });
}

function typeWord(word) {
  typeKeys(word.split(''));
}

describe('EasterEggManager', () => {
  beforeEach(() => {
    Object.assign(easterEggConfig, originalConfig);
  });

  afterEach(() => {
    Object.assign(easterEggConfig, originalConfig);
  });

  it('typing "matrix" activates MatrixRain', () => {
    const { queryByTestId } = render(<EasterEggManager />);
    expect(queryByTestId('matrix')).toBeNull();
    typeWord('matrix');
    expect(queryByTestId('matrix')).not.toBeNull();
  });

  it('typing "snake" activates SnakeGame', () => {
    const { queryByTestId } = render(<EasterEggManager />);
    typeWord('snake');
    expect(queryByTestId('snake')).not.toBeNull();
  });

  it('typing "flappy" activates FlappyBird', () => {
    const { queryByTestId } = render(<EasterEggManager />);
    typeWord('flappy');
    expect(queryByTestId('flappy')).not.toBeNull();
  });

  it('typing "microsoft" activates ClippyAssistant', () => {
    const { queryByTestId } = render(<EasterEggManager />);
    typeWord('microsoft');
    expect(queryByTestId('clippy')).not.toBeNull();
  });

  it('typing "dogs" activates DogOnCursor', () => {
    const { queryByTestId } = render(<EasterEggManager />);
    typeWord('dogs');
    expect(queryByTestId('dog')).not.toBeNull();
  });

  it('Escape key closes active egg', () => {
    const { queryByTestId } = render(<EasterEggManager />);
    typeWord('snake');
    expect(queryByTestId('snake')).not.toBeNull();
    typeKeys(['Escape']);
    expect(queryByTestId('snake')).toBeNull();
  });

  it('backtick opens terminal', () => {
    const { queryByTestId } = render(<EasterEggManager />);
    typeKeys(['`']);
    expect(queryByTestId('terminal')).not.toBeNull();
  });

  it('Konami code activates KonamiSpaceShooter', () => {
    const { queryByTestId } = render(<EasterEggManager />);
    typeKeys([
      'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
      'b', 'a',
    ]);
    expect(queryByTestId('konami')).not.toBeNull();
  });

  it('ignores key events on input elements', () => {
    const { queryByTestId } = render(
      <div>
        <input data-testid="input" />
        <EasterEggManager />
      </div>
    );
    const input = document.querySelector('input');
    // Simulate typing "snake" while focused on input
    'snake'.split('').forEach((key) => {
      act(() => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      });
    });
    expect(queryByTestId('snake')).toBeNull();
  });

  it('respects config toggle — disabled egg does not activate', () => {
    easterEggConfig.snakeGame = false;
    const { queryByTestId } = render(<EasterEggManager />);
    typeWord('snake');
    expect(queryByTestId('snake')).toBeNull();
  });

  it('skips pattern detection while an egg is active', () => {
    const { queryByTestId } = render(<EasterEggManager />);
    typeWord('snake');
    expect(queryByTestId('snake')).not.toBeNull();
    // Typing "dogs" while snake is active should not activate dog
    typeWord('dogs');
    expect(queryByTestId('dog')).toBeNull();
    expect(queryByTestId('snake')).not.toBeNull();
  });
});
