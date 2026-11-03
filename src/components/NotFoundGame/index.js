import React, { useEffect, useReducer, useRef, useState } from 'react';
import { BEST_SCORE_KEY, PAIR_COUNT, gameReducer, initialGame, parseBestScore, shuffleDeck } from './game';
import translations from './translations';
import styles from './styles.module.css';

export default function NotFoundGame({ locale = 'en' }) {
  const language = Object.hasOwn(translations, locale) ? locale : 'en';
  const text = translations[language];
  const home = language === 'en' ? '/' : `/${language}/`;
  const [game, dispatch] = useReducer(gameReducer, initialGame);
  const [best, setBest] = useState(0);
  const [storageIssue, setStorageIssue] = useState(null);
  const bestRef = useRef(0);
  const firstCardRef = useRef(null);
  const playButtonRef = useRef(null);
  const started = game.deck.length > 0;
  const complete = game.matched.length === PAIR_COUNT * 2;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(BEST_SCORE_KEY);
      const score = parseBestScore(stored);
      if (stored !== null && score === null) {
        setStorageIssue('invalid');
      } else {
        bestRef.current = score ?? 0;
        setBest(bestRef.current);
      }
    } catch {
      setStorageIssue('unavailable');
    }
  }, []);

  useEffect(() => {
    if (game.deck.length > 0) firstCardRef.current?.focus();
  }, [game.deck]);

  useEffect(() => {
    if (!complete) return;
    playButtonRef.current?.focus();
    bestRef.current = Math.max(bestRef.current, game.score);
    try {
      const stored = window.localStorage.getItem(BEST_SCORE_KEY);
      const previous = parseBestScore(stored);
      bestRef.current = Math.max(bestRef.current, previous ?? 0);
      if (previous !== bestRef.current) {
        window.localStorage.setItem(BEST_SCORE_KEY, String(bestRef.current));
      }
      setStorageIssue(null);
    } catch {
      setStorageIssue('unavailable');
    }
    setBest(bestRef.current);
  }, [complete, game.score]);

  const status = game.result === 'won'
    ? text.won(game.score, game.moves)
    : game.result === 'match'
      ? text.match(game.lastPoints, game.streak)
      : text[game.result];
  const cards = started ? game.deck : Array(PAIR_COUNT * 2).fill(null);

  return (
    <main className={styles.page} lang={language}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p className={styles.description}>{text.description}</p>
        <nav className={styles.links} aria-label={text.eyebrow}>
          <a className={styles.homeLink} href={home}>{text.home}</a>
          <a href={`${home}blog`}>{text.blog} <span aria-hidden="true">&rarr;</span></a>
        </nav>
      </header>

      <section className={styles.game} aria-labelledby="memory-title">
        <div className={styles.gameHeading}>
          <div>
            <p className={styles.tag}>{text.gameTag}</p>
            <h2 id="memory-title">{text.gameTitle}</h2>
          </div>
          <span className={styles.badge} aria-hidden="true">{'{ }'}</span>
        </div>
        <p id="memory-instructions" className={styles.instructions}>{text.instructions}</p>
        <dl className={styles.stats}>
          <div><dt>{text.score}</dt><dd>{game.score}</dd></div>
          <div><dt>{text.best}</dt><dd>{best}</dd></div>
          <div><dt>{text.moves}</dt><dd>{game.moves}</dd></div>
          <div><dt>{text.pairs}</dt><dd>{game.matched.length / 2}<span> / {PAIR_COUNT}</span></dd></div>
        </dl>
        <div className={styles.grid} role="group" aria-label={text.board} aria-describedby="memory-instructions memory-controls">
          {cards.map((symbol, index) => {
            const matched = game.matched.includes(index);
            const revealed = matched || game.selected.includes(index);
            return (
              <button
                key={index}
                ref={index === 0 ? firstCardRef : undefined}
                type="button"
                className={`${styles.card} ${revealed ? styles.revealed : ''} ${matched ? styles.matched : ''}`}
                disabled={!started}
                aria-disabled={matched || undefined}
                tabIndex={matched ? -1 : 0}
                aria-label={text.card(index + 1, revealed ? text.symbols[symbol] : null, matched)}
                onClick={() => dispatch({ type: 'pick', index })}
              >
                <span aria-hidden="true" className={styles.symbol}>{revealed ? symbol : '?'}</span>
                {matched && <span className={styles.check} aria-hidden="true">&#10003;</span>}
              </button>
            );
          })}
        </div>
        <p role="status" aria-atomic="true" className={`${styles.status} ${complete ? styles.complete : ''}`}>{status}</p>
        <button
          ref={playButtonRef}
          type="button"
          className={styles.playButton}
          onClick={() => dispatch({ type: 'start', deck: shuffleDeck() })}
        >
          {complete ? text.replay : started ? text.restart : text.start}
          <span aria-hidden="true"> &rarr;</span>
        </button>
        <p id="memory-controls" className={styles.help}>{text.controls}</p>
        <p className={styles.help}>{text.scoring}</p>
        <p className={styles.storage} role={storageIssue ? 'status' : undefined}>
          {storageIssue ? text[storageIssue] : text.saved}
        </p>
      </section>
    </main>
  );
}
