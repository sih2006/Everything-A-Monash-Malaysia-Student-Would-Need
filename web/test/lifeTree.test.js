// Tests for the life tree's layout and its open and closed nodes. No browser needed.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createAppViewModel } from '../js/viewmodels/appViewModel.js';
import { COLUMN, ROW, layoutLife, openAll, openToToday, startOpen } from '../js/viewmodels/lifeTree.js';
import { MASK } from '../js/viewmodels/present.js';

const n = (id, fields = {}, children = []) => ({ id, level: 'item', area: null, title: id, value: '', note: '', done: null, time: null, tone: '', now: false, grade: false, children, ...fields });

// You → 2025, 2026 (now) → 2026 has Studies (now, with two units) and Money.
const tree = n('life', { level: 'root', now: true }, [
  n('life/2025', { level: 'year', title: '2025' }, [n('life/2025/money', { level: 'area' })]),
  n('life/2026', { level: 'year', title: '2026', now: true }, [
    n('life/2026/studies', { level: 'area', now: true }, [
      n('life/2026/studies/S2', { level: 'term', now: true }, [
        n('life/2026/studies/S2/FIT2085', { level: 'unit', now: true, grade: true, value: '72.0% so far', note: 'On course.', done: 0.4 }),
        n('life/2026/studies/S2/FIT2107', { level: 'unit', now: true })
      ])
    ]),
    n('life/2026/money', { level: 'area' }, [n('life/2026/money/2026-11', { level: 'month' })])
  ])
]);

test('it starts with you and this year open', () => {
  assert.deepEqual([...startOpen(tree)], ['life', 'life/2026']);
});

test('the years run down one line on the left and "You" is not drawn', () => {
  const { nodes, edges } = layoutLife(tree, startOpen(tree));
  const years = nodes.filter((x) => x.level === 'year');
  assert.equal(nodes.some((x) => x.level === 'root'), false);
  assert.equal(new Set(years.map((x) => x.x)).size, 1);                   // all on the same line
  assert.ok(years[0].y < years[1].y);                                    // oldest at the top
  const trunk = edges.filter((e) => e.kind === 'trunk');
  assert.equal(trunk.length, 1);
  assert.equal(trunk[0].now, true);                                      // 2025 to 2026 is behind you
});

test('a year ahead is marked, and the line to it is not walked yet', () => {
  const withNext = { ...tree, children: [...tree.children, n('life/2027', { level: 'year', title: '2027' })] };
  const { nodes, edges } = layoutLife(withNext, startOpen(withNext));
  assert.equal(nodes.find((x) => x.id === 'life/2027').ahead, true);
  assert.equal(nodes.find((x) => x.id === 'life/2026').ahead, false);
  assert.deepEqual(edges.filter((e) => e.kind === 'trunk').map((e) => e.now), [true, false]);
});

test('closed nodes hide their children; open ones show them one column to the right', () => {
  const { nodes } = layoutLife(tree, startOpen(tree));
  assert.deepEqual(nodes.map((x) => x.id).sort(), ['life/2025', 'life/2026', 'life/2026/money', 'life/2026/studies'].sort());
  const at = (id) => nodes.find((x) => x.id === id);
  assert.equal(at('life/2026/studies').x - at('life/2026').x, COLUMN);
  assert.equal(at('life/2026/money').y - at('life/2026/studies').y, ROW);
  // A parent sits halfway between its first and last child.
  assert.equal(at('life/2026').y, (at('life/2026/studies').y + at('life/2026/money').y) / 2);
  assert.equal(at('life/2025').open, false);
  assert.equal(at('life/2025').count, 1);
});

test('open to today follows the path to the deepest node that is now, and marks it for Find today', () => {
  const open = openToToday(tree, startOpen(tree));
  assert.ok(open.has('life/2026/studies/S2'));
  const { nodes } = layoutLife(tree, open);
  assert.equal(nodes.filter((x) => x.kind === 'now').length, 1);
  assert.equal(nodes.find((x) => x.kind === 'now').x, 3 * COLUMN + nodes.find((x) => x.id === 'life/2026').x);   // year, area, semester, unit
});

test('open all opens down to months, never deeper', () => {
  const open = openAll(tree, 'month');
  assert.ok(open.has('life/2025') && open.has('life/2026/money'));
  assert.equal(open.has('life/2026/money/2026-11'), false);    // a month with no children stays as it is
});

test('every edge joins a parent to a child that is drawn', () => {
  const { nodes, edges } = layoutLife(tree, openToToday(tree, startOpen(tree)));
  for (const e of edges) assert.ok(nodes.some((x) => x.x === e.to.x && x.y === e.to.y));
  assert.equal(edges.length, nodes.length - 1);                // the year line plus one branch for every node below a year
});

test('hidden grades: figures marked as grades become dots and their ring is removed', () => {
  const open = openToToday(tree, startOpen(tree));
  const unit = layoutLife(tree, open, true).nodes.find((x) => x.id === 'life/2026/studies/S2/FIT2085');
  assert.deepEqual([unit.value, unit.note, unit.done], [MASK, 'Details hidden.', null]);
  assert.equal(layoutLife(tree, open, false).nodes.find((x) => x.id === unit.id).done, 0.4);
});

test('opening the app straight onto the map loads the tree', async () => {
  // Regression test: the tree once stayed on "Loading" when the app was opened at #map.
  let loads = 0;
  const api = { overview: () => Promise.resolve({ today: '2026-11-21' }), life: () => { loads += 1; return Promise.resolve(tree); } };
  const vm = createAppViewModel({ api, storage: { get: () => null, set: () => {} } });
  vm.state.tab = 'map';
  await vm.load();
  assert.equal(loads, 1);
  assert.equal(vm.state.life, tree);
});

test('the ViewModel loads the tree when the map opens, and toggles nodes', async () => {
  let loads = 0;
  const api = { overview: () => Promise.resolve({ today: '2026-11-21' }), life: () => { loads += 1; return Promise.resolve(tree); } };
  const vm = createAppViewModel({ api, storage: { get: () => null, set: () => {} } });
  await vm.load();
  vm.setTab('map');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(loads, 1);
  assert.equal(vm.state.life, tree);
  vm.toggleLifeNode('life/2025');
  assert.ok(vm.state.lifeOpen.has('life/2025'));
  assert.equal(vm.state.lifeSelected, 'life/2025');
  vm.toggleLifeNode('life/2025');
  assert.equal(vm.state.lifeOpen.has('life/2025'), false);
  vm.lifeCloseAll();
  assert.deepEqual([...vm.state.lifeOpen], ['life']);
  vm.toggleMapFull();
  assert.equal(vm.state.mapFull, true);
  vm.setTab('home');
  assert.equal(vm.state.mapFull, false);                      // leaving the map leaves full page
});
