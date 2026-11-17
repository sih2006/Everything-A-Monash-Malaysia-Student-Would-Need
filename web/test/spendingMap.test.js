import { test } from 'node:test';
import assert from 'node:assert/strict';
import { presentSpendingMap, squarify } from '../js/viewmodels/spendingMap.js';

const close = (a, b) => Math.abs(a - b) < 1e-6;
const overlap = (a, b) => a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6;

test('squarify: each block gets an area in proportion to its value, inside the box, with no overlaps', () => {
  const items = [6, 6, 4, 3, 2, 2, 1].map((value, i) => ({ id: i, value }));
  const rects = squarify(items, 0, 0, 600, 400);
  assert.equal(rects.length, 7);
  for (const r of rects) {
    assert.ok(close(r.w * r.h, (r.value / 24) * 600 * 400), `area of ${r.id}`);
    assert.ok(r.x >= -1e-6 && r.y >= -1e-6 && r.x + r.w <= 600 + 1e-6 && r.y + r.h <= 400 + 1e-6, `inside: ${r.id}`);
  }
  for (const a of rects) for (const b of rects) if (a !== b) assert.ok(!overlap(a, b), `${a.id} and ${b.id} overlap`);
  // The classic worked example keeps blocks near square: none is more than 3 times longer than wide.
  for (const r of rects) assert.ok(Math.max(r.w / r.h, r.h / r.w) < 3, `shape of ${r.id}`);
});

test('squarify: nothing to show gives no blocks; zero values are left out', () => {
  assert.deepEqual(squarify([], 0, 0, 10, 10), []);
  assert.deepEqual(squarify([{ value: 0 }], 0, 0, 10, 10), []);
  assert.equal(squarify([{ value: 1 }, { value: 0 }], 0, 0, 10, 10).length, 1);
});

const category = (name, perMonth) => ({ category: name, perMonth, amount: perMonth * 3, places: [{ what: `${name} shop`, perMonth, count: 3 }] });

test('spending map: colours follow the category name, not its size; past seven, categories fold into Everything else', () => {
  const byCategory = [category('Shopping', 500), category('Eating out', 900), category('Games', 40), category('Laundry', 5),
    category('Transport', 60), category('Fun', 120), category('Phone', 35), category('Care', 12), category('Books', 8)];
  const map = presentSpendingMap({ perMonth: 1680, months: 3, essential: ['Rent'], byCategory: [...byCategory].sort((a, b) => b.perMonth - a.perMonth) }, 1000, 560);
  assert.equal(map.blocks.length, 8);
  const other = map.blocks.find((b) => b.category === 'Everything else');
  assert.equal(other.colour, 0);
  assert.equal(other.perMonth, 13);                                    // the two smallest: Books 8 + Laundry 5
  assert.deepEqual(other.places.map((p) => p.what).sort(), ['Books', 'Laundry']);
  // Eating out is the biggest, but its colour comes from its place in name order among the seven shown.
  assert.equal(map.blocks.find((b) => b.category === 'Eating out').colour, 2);
  assert.equal(map.blocks.find((b) => b.category === 'Care').colour, 1);
  assert.deepEqual(map.legend.map((l) => l.category).slice(0, 2), ['Eating out', 'Shopping']);
});

test('spending map: nothing to cut gives no map', () => {
  assert.equal(presentSpendingMap({ perMonth: 0, months: 3, byCategory: [] }, 100, 100), null);
  assert.equal(presentSpendingMap(null, 100, 100), null);
});

test('spending map: Everything else is always last in the legend', () => {
  const byCategory = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((n, i) => category(n, 100 - i));
  byCategory[7] = category('H', 1);
  const big = [...byCategory, category('I', 500), category('J', 400)].sort((a, b) => b.perMonth - a.perMonth);
  assert.equal(presentSpendingMap({ perMonth: 1, months: 3, essential: [], byCategory: big }, 1000, 560).legend.at(-1).category, 'Everything else');
});
