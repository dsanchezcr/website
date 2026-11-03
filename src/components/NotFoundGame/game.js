export const SYMBOLS = ['</>', '{ }', '[ ]', '#', '404', ';'];
export const PAIR_COUNT = SYMBOLS.length;
export const MAX_SCORE = 975;
export const BEST_SCORE_KEY = 'dsanchezcr.404-memory.best.v1';

export const initialGame = {
  deck: [],
  selected: [],
  matched: [],
  moves: 0,
  streak: 0,
  score: 0,
  lastPoints: 0,
  result: 'ready',
};

export function shuffleDeck(random = Math.random) {
  const deck = [...SYMBOLS, ...SYMBOLS];
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [deck[index], deck[other]] = [deck[other], deck[index]];
  }
  return deck;
}

export function parseBestScore(value) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,2})$/.test(value)) return null;
  const score = Number(value);
  return score <= MAX_SCORE ? score : null;
}

export function gameReducer(state, action) {
  if (action.type === 'start') {
    return { ...initialGame, deck: action.deck, result: 'started' };
  }
  if (action.type !== 'pick') return state;

  const { index } = action;
  if (
    !Number.isInteger(index) || index < 0 || index >= state.deck.length ||
    state.matched.includes(index) ||
    (state.selected.length === 1 && state.selected[0] === index)
  ) return state;

  if (state.selected.length !== 1) {
    return { ...state, selected: [index], result: 'pick', lastPoints: 0 };
  }

  const selected = [state.selected[0], index];
  const moves = state.moves + 1;
  if (state.deck[selected[0]] !== state.deck[index]) {
    return { ...state, selected, moves, streak: 0, lastPoints: 0, result: 'miss' };
  }

  const matched = [...state.matched, ...selected];
  const lastPoints = 100 + 25 * state.streak;
  return {
    ...state,
    selected: [],
    matched,
    moves,
    streak: state.streak + 1,
    score: state.score + lastPoints,
    lastPoints,
    result: matched.length === state.deck.length ? 'won' : 'match',
  };
}
