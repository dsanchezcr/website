import { describe, expect, it } from 'vitest';
import { MAX_SCORE, SYMBOLS, gameReducer, initialGame, parseBestScore, shuffleDeck } from '../game';

const start = () => gameReducer(initialGame, { type: 'start', deck: [...SYMBOLS, ...SYMBOLS] });
const pick = (state, index) => gameReducer(state, { type: 'pick', index });
const pair = (state, index) => pick(pick(state, index), index + SYMBOLS.length);

describe('404 memory game rules', () => {
  it('creates exactly six pairs without mutating the symbol list', () => {
    const deck = shuffleDeck(() => 0);
    expect(deck).toHaveLength(12);
    for (const symbol of SYMBOLS) expect(deck.filter((value) => value === symbol)).toHaveLength(2);
    expect(deck).not.toEqual([...SYMBOLS, ...SYMBOLS]);
    expect(SYMBOLS).toHaveLength(6);
  });

  it('does not count the first pick or repeated picks of that card as moves', () => {
    const first = pick(start(), 0);
    expect(first.moves).toBe(0);
    expect(first.selected).toEqual([0]);
    expect(pick(first, 0)).toBe(first);
  });

  it('leaves mismatches visible until the next pick, including reselecting one', () => {
    const miss = pick(pick(start(), 0), 1);
    expect(miss).toMatchObject({ selected: [0, 1], moves: 1, score: 0, result: 'miss' });
    expect(pick(miss, 2)).toMatchObject({ selected: [2], moves: 1 });
    expect(pick(miss, 0)).toMatchObject({ selected: [0], moves: 1 });
  });

  it('awards streak bonuses once and resets the streak after a mismatch', () => {
    const first = pair(start(), 0);
    const second = pair(first, 1);
    expect(second).toMatchObject({ moves: 2, score: 225, streak: 2, lastPoints: 125 });
    expect(pick(second, 0)).toBe(second);
    const miss = pick(pick(second, 2), 3);
    expect(miss.streak).toBe(0);
    expect(pair(miss, 2)).toMatchObject({ moves: 4, score: 325, streak: 1, lastPoints: 100 });
  });

  it('completes a perfect round at 975 points and prevents further scoring', () => {
    let game = start();
    for (let index = 0; index < SYMBOLS.length; index += 1) game = pair(game, index);
    expect(game).toMatchObject({ moves: 6, score: MAX_SCORE, result: 'won' });
    expect(game.matched).toHaveLength(12);
    expect(pick(game, 0)).toBe(game);
  });

  it('resets the entire round when restarting during a mismatch', () => {
    const old = pick(pick(pair(start(), 0), 1), 2);
    const deck = shuffleDeck(() => 0);
    expect(gameReducer(old, { type: 'start', deck })).toEqual({ ...initialGame, deck, result: 'started' });
  });

  it('ignores selections before starting and out-of-range indices', () => {
    expect(pick(initialGame, 0)).toBe(initialGame);
    const state = start();
    for (const index of [-1, 12, 0.5, NaN]) expect(pick(state, index)).toBe(state);
  });
});

describe('stored score validation', () => {
  it.each(['0', '600', '975'])('accepts a bounded integer: %s', (value) => {
    expect(parseBestScore(value)).toBe(Number(value));
  });

  it.each([null, '', ' ', '-1', '976', '1.5', 'Infinity', 'NaN', '{}', '01', '9e2', '99999999999'])(
    'rejects malformed or out-of-range storage: %s',
    (value) => expect(parseBestScore(value)).toBeNull(),
  );
});
