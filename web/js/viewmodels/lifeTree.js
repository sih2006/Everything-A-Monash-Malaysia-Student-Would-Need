// ViewModel part for the life tree: which nodes are open, and where each one sits on the page.
//
// The tree itself comes from the backend (GET /api/life). This file only decides the layout:
// it has no HTML and does not touch the page, so it is tested in Node like the other presenters.

import { MASK } from './present.js';

export const COLUMN = 300;   // space from one level to the next, left to right
export const ROW = 92;       // space between two nodes in the same column
export const NODE_WIDTH = 236;   // a circle and its label; branches start where the label ends
const YEAR_GAP = 56;         // extra space (px) between two years, so each year reads as its own block
const PAD = 90;

// The nodes that start open: the root (never drawn), and this year, so its four areas show.
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

// Places the open part of the tree. The years run down one line on the left, oldest at the top.
// Each open node's children open one column to the right; each closed node takes one row,
// and a parent sits halfway between its first and last child. "You" (the root) is not drawn.
// Hidden grades: any node marked `grade` shows dots instead of its figures.
export function layoutLife(tree, open, hidden = false) {
  const nodes = [];
  const edges = [];
  let nextRow = 0;
  let gap = 0;                 // the space added between years so far
  const thisYear = Number(tree.children.find((y) => y.now)?.title ?? 0);

  function place(n, depth) {
    const isOpen = open.has(n.id) && n.children.length > 0;
    const x = PAD + depth * COLUMN;
    let y;
    if (isOpen) {
      const kids = n.children.map((child) => place(child, depth + 1));
      y = (kids[0].y + kids[kids.length - 1].y) / 2;
      for (const kid of kids) edges.push({ kind: 'branch', from: { x, y }, to: { x: kid.x, y: kid.y }, now: kid.now && n.now });
    } else {
      y = PAD + nextRow * ROW + gap;
      nextRow += 1;
    }
    const masked = hidden && n.grade;
    const item = {
      id: n.id, level: n.level, area: n.area, title: n.title,
      value: masked ? MASK : n.value,
      note: masked ? 'Details hidden.' : n.note,
      done: masked ? null : n.done, time: n.time, tone: n.tone, now: n.now,
      ahead: n.level === 'year' && Number(n.title) > thisYear,
      empty: n.empty === true,
      count: n.children.length, open: isOpen,
      x, y
    };
    nodes.push(item);
    return item;
  }

  // The year line. Solid up to this year, dashed for the years ahead. A little space between years.
  const years = tree.children.map((year) => {
    const placed = place(year, 0);
    gap += YEAR_GAP;
    return placed;
  });
  for (let i = 1; i < years.length; i++) {
    edges.push({ kind: 'trunk', from: { x: years[i - 1].x, y: years[i - 1].y }, to: { x: years[i].x, y: years[i].y }, now: !years[i].ahead });
  }

  // The deepest open node on the way to today is where "Find today" goes.
  const nowNodes = nodes.filter((n) => n.now);
  const deepest = nowNodes.reduce((best, n) => (!best || n.x > best.x ? n : best), null);
  for (const n of nodes) n.kind = n === deepest ? 'now' : 'node';

  const width = Math.max(...nodes.map((n) => n.x)) + COLUMN + PAD;
  const height = Math.max(...nodes.map((n) => n.y)) + PAD;
  return { nodes, edges, width, height };
}
