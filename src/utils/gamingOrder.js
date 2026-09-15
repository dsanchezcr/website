export function sortGamingEntries(items, section) {
  const number = (value, fallback) => Number.isFinite(value) ? value : fallback;
  const date = (value) => {
    const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
    return Number.isFinite(parsed) ? parsed : -Infinity;
  };
  const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  return items.slice().sort((a, b) => {
    if (section?.toLowerCase() === 'topgames') {
      return compare(number(a.order, 0), number(b.order, 0)) ||
        compare(a.id || '', b.id || '');
    }
    return compare(number(a.manualOrder, Infinity), number(b.manualOrder, Infinity)) ||
      compare(date(b.createdAt), date(a.createdAt)) ||
      compare(number(b.order, 0), number(a.order, 0)) ||
      compare(a.id || '', b.id || '');
  });
}
