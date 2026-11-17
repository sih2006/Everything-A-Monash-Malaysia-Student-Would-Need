// ViewModel part for the life tree: which nodes are open, and where each one sits on the page.
//
// The tree itself comes from the backend (GET /api/life). This file only decides the layout:
// it has no HTML and does not touch the page, so it is tested in Node like the other presenters.

import { MASK } from './present.js';

export const COLUMN = 250;   // space from one level to the next, left to right
export const ROW = 104;      // space between two nodes in the same column
const PAD = 90;

// The nodes that start open: you, and the path to today down to the four areas of this year.
export function startOpen(tree) {
  const open = new Set([tree.id]);
  for (const year of tree.children) if (year.now) open.add(year.id);
  return open;
}

// Opens every node on the way to today, as deep as it goes.
export function openToToday(tree, open) {
  const next = new Set(open);
  const walk = (n) => {
    if (!n.now || !n.children.length) return;
    next.add(n.id);
    n.children.forEach(walk);
  };
  walk(tree);
  return next;
}

export function openAll(tree, maxLevel = 'term') {
  const levels = ['root', 'year', 'area', 'term', 'month'];
  const deepest = levels.indexOf(maxLevel);
  const next = new Set();
  const walk = (n) => {
    if (n.children.length && levels.indexOf(n.level) !== -1 && levels.indexOf(n.level) <= deepest) next.add(n.id);
    n.children.forEach(walk);
  };
  walk(tree);
  return next;
}

export function findNode(tree, id) {
  if (tree.id === id) return tree;
  for (const child of tree.children) {
    const hit = findNode(child, id);
    if (hit) return hit;
  }
  return null;
}

// Places the open part of the tree: each level is a column, each leaf a row,
// and each parent sits halfway between its first and last child.
// Hidden grades: any node marked `grade` shows dots instead of its figures.
export function layoutLife(tree, open, hidden = false) {
  const nodes = [];
  const edges = [];
  let nextRow = 0;

  function place(n, depth) {
    const isOpen = open.has(n.id) && n.children.length > 0;
    let y;
    if (isOpen) {
      const kids = n.children.map((child) => place(child, depth + 1));
      y = (kids[0].y + kids[kids.length - 1].y) / 2;
      for (const kid of kids) edges.push({ from: { x: PAD + depth * COLUMN, y }, to: { x: kid.x, y: kid.y }, now: kid.now && n.now });
    } else {
      y = PAD + nextRow * ROW;
      nextRow += 1;
    }
    const masked = hidden && n.grade;
    const item = {
      id: n.id, level: n.level, area: n.area, title: n.title,
      value: masked ? MASK : n.value,
      note: masked ? 'Details hidden.' : n.note,
      done: masked ? null : n.done, time: n.time, tone: n.tone, now: n.now,
      count: n.children.length, open: isOpen,
      x: PAD + depth * COLUMN, y
    };
    nodes.push(item);
    return item;
  }
  place(tree, 0);

  // The deepest open node on the way to today is where "Find today" goes.
  const nowNodes = nodes.filter((n) => n.now);
  const deepest = nowNodes.reduce((best, n) => (!best || n.x > best.x ? n : best), null);
  for (const n of nodes) n.kind = n === deepest ? 'now' : 'node';

  const width = Math.max(...nodes.map((n) => n.x)) + COLUMN + PAD;
  const height = Math.max(...nodes.map((n) => n.y)) + PAD;
  return { nodes, edges, width, height };
}
