// The spending map on the Expenses tab: a treemap. Each category is a block sized by what it costs a month,
// and the places inside it are smaller blocks. Pure functions only, so they can be tested without a browser.

// Squarified treemap (Bruls, Huizing and van Wijk, 2000): fills the rectangle so the blocks stay close to square.
// `items` have a positive `value`. Returns the items with x, y, w and h added, biggest first.
export function squarify(items, x, y, w, h) {
  const total = items.reduce((sum, i) => sum + (i.value > 0 ? i.value : 0), 0);
  if (total <= 0 || w <= 0 || h <= 0) return [];
  const scale = (w * h) / total;
  const nodes = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value).map((item) => ({ item, area: item.value * scale }));
  const out = [];
  let free = { x, y, w, h };
  // How far from square the worst block in a row would be. Lower is better.
  const worst = (row, side) => {
    const sum = row.reduce((s, n) => s + n.area, 0);
    const most = Math.max(...row.map((n) => n.area)), least = Math.min(...row.map((n) => n.area));
    return Math.max((side * side * most) / (sum * sum), (sum * sum) / (side * side * least));
  };
  const place = (row) => {
    const sum = row.reduce((s, n) => s + n.area, 0);
    if (free.w >= free.h) {          // a column on the left
      const width = sum / free.h;
      let top = free.y;
      for (const n of row) { const height = n.area / width; out.push({ ...n.item, x: free.x, y: top, w: width, h: height }); top += height; }
      free = { x: free.x + width, y: free.y, w: free.w - width, h: free.h };
    } else {                         // a row along the top
      const height = sum / free.w;
      let left = free.x;
      for (const n of row) { const width = n.area / height; out.push({ ...n.item, x: left, y: free.y, w: width, h: height }); left += width; }
      free = { x: free.x, y: free.y + height, w: free.w, h: free.h - height };
    }
  };
  let row = [];
  for (const n of nodes) {
    const side = Math.min(free.w, free.h);
    if (row.length === 0 || worst([...row, n], side) <= worst(row, side)) row.push(n);
    else { place(row); row = [n]; }
  }
  if (row.length) place(row);
  return out;
}

export const MAP_COLOURS = 7;          // categorical colours; any more categories fold into "Everything else"
const HEADER = 34;                     // room at the top of a category block for its name
const GAP = 3;                         // space between blocks, in layout units

// Lays out the map for a canvas of `width` by `height` layout units.
// Blocks are sized by what was spent over the whole period; each also keeps what that comes to a month.
// Colour follows the category, not its size: the categories shown are given colours in name order.
export function presentSpendingMap(reducible, width, height) {
  const all = (reducible?.byCategory ?? []).filter((c) => c.amount > 0).map((c) => ({ ...c, total: c.amount }));
  if (all.length === 0) return null;
  let shown = all.slice(0, MAP_COLOURS);
  const folded = all.slice(MAP_COLOURS);
  const names = shown.map((c) => c.category).sort((a, b) => a.localeCompare(b));
  shown = shown.map((c) => ({ ...c, colour: names.indexOf(c.category) + 1 }));
  if (folded.length) {
    shown.push({
      category: 'Everything else', colour: 0,
      total: round2(folded.reduce((s, c) => s + c.total, 0)), perMonth: round2(folded.reduce((s, c) => s + c.perMonth, 0)),
      places: folded.map((c) => ({ what: c.category, total: c.total, perMonth: c.perMonth, count: c.places.reduce((s, p) => s + p.count, 0) }))
    });
  }
  const blocks = squarify(shown.map((c) => ({ ...c, value: c.total })), 0, 0, width, height).map((b) => {
    const labelled = b.h >= HEADER * 2.2 && b.w >= 170;
    const top = b.y + (labelled ? HEADER : GAP);
    const inner = squarify(b.places.filter((p) => p.total > 0).map((p) => ({ ...p, value: p.total })),
      b.x + GAP, top, Math.max(0, b.w - GAP * 2), Math.max(0, b.y + b.h - top - GAP));
    return { ...b, labelled, places: inner.map((p) => ({ ...p, labelled: p.w >= 100 && p.h >= 40 })) };
  });
  return {
    width, height, total: reducible.total, perMonth: reducible.perMonth, months: reducible.months, essential: reducible.essential,
    legend: [...shown].sort((a, b) => (a.colour === 0) - (b.colour === 0) || b.total - a.total).map((c) => ({ category: c.category, colour: c.colour, total: c.total, perMonth: c.perMonth })),
    blocks
  };
}

const round2 = (n) => Math.round(n * 100) / 100;
