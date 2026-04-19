import React, { useEffect, useState, useCallback, useRef } from 'react';
import easterEggConfig from './easterEggConfig';
import KonamiSpaceShooter from './KonamiSpaceShooter';
import SecretTerminal from './SecretTerminal';
import MatrixRain from './MatrixRain';
import ClippyAssistant from './ClippyAssistant';
import BirthdayEgg from './BirthdayEgg';
import FlappyBird from './FlappyBird';
import SnakeGame from './SnakeGame';
import DogOnCursor from './DogOnCursor';
import CostaRicaConfetti from './CostaRicaConfetti';

export default function EasterEggManager() {
  const [activeEgg, setActiveEgg] = useState(null);
  const typedKeysRef = useRef('');

  const closeEgg = useCallback(() => setActiveEgg(null), []);

  // Konami code sequence
  const KONAMI = 'ArrowUpArrowUpArrowDownArrowDownArrowLeftArrowRightArrowLeftArrowRightba';

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input/textarea
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

      // Backtick opens terminal
      if (e.key === '`' && easterEggConfig.secretTerminal && !activeEgg) {
        e.preventDefault();
        setActiveEgg('terminal');
        return;
      }

      // Escape closes any active egg
      if (e.key === 'Escape' && activeEgg) {
        closeEgg();
        return;
      }

      // Build typed key buffer for pattern detection (useRef to avoid re-renders)
      const next = (typedKeysRef.current + e.key).slice(-80);

      // Konami code
      if (easterEggConfig.konamiSpaceShooter && next.endsWith(KONAMI)) {
        typedKeysRef.current = '';
        setActiveEgg('konami');
        return;
      }

      // Matrix
      if (easterEggConfig.matrixRain && next.toLowerCase().endsWith('matrix')) {
        typedKeysRef.current = '';
        setActiveEgg('matrix');
        return;
      }

      // Clippy
      if (easterEggConfig.clippy && next.toLowerCase().endsWith('microsoft')) {
        typedKeysRef.current = '';
        setActiveEgg('clippy');
        return;
      }

      // Flappy Bird
      if (easterEggConfig.flappyBird && next.toLowerCase().endsWith('flappy')) {
        typedKeysRef.current = '';
        setActiveEgg('flappy');
        return;
      }

      // Snake
      if (easterEggConfig.snakeGame && next.toLowerCase().endsWith('snake')) {
        typedKeysRef.current = '';
        setActiveEgg('snake');
        return;
      }

      // Dog
      if (easterEggConfig.dogOnCursor && next.toLowerCase().endsWith('dogs')) {
        typedKeysRef.current = '';
        setActiveEgg('dog');
        return;
      }

      typedKeysRef.current = next;
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeEgg, closeEgg]);

  return (
    <>
      {activeEgg === 'konami' && <KonamiSpaceShooter onClose={closeEgg} />}
      {activeEgg === 'terminal' && <SecretTerminal onClose={closeEgg} />}
      {activeEgg === 'matrix' && <MatrixRain onClose={closeEgg} />}
      {activeEgg === 'clippy' && <ClippyAssistant onClose={closeEgg} />}
      {activeEgg === 'flappy' && <FlappyBird onClose={closeEgg} />}
      {activeEgg === 'snake' && <SnakeGame onClose={closeEgg} />}
      {activeEgg === 'dog' && <DogOnCursor onClose={closeEgg} />}
      {easterEggConfig.birthday && <BirthdayEgg />}
      {easterEggConfig.costaRicaConfetti && <CostaRicaConfetti />}
    </>
  );
}
