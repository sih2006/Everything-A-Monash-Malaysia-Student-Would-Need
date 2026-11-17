// Tests for the life tree. It is a pure function, so these need no server and no database.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { lifeTree } from '../src/life.js';

const TODAY = '2026-11-17';
const empty = { today: TODAY, report: null, termDates: null, transactions: [], limit: null, foodLog: [], foodTargets: null, healthDays: [], workouts: [], healthTargets: null };

// A small engine report, in the shape the C++ engine sends.
const report = {
  currentTerm: 'S2 2026',
  terms: [
    { term: 'S1 2025', gpa: 2.325, cgpa: 2.825, wam: 65, units: [{ code: 'ENG1005', name: 'Maths', mark: 45, grade: 'NH' }, { code: 'FIT1045', name: 'Programming', mark: 82, grade: 'HD' }] },
    { term: 'S1 2026', gpa: 2.25, cgpa: 3.055, wam: 65.1, units: [{ code: 'FIT2099', name: 'OO design', mark: 61, grade: 'C' }] }
  ],
  current: { cgpa: 3.2 },
  units: [{
    code: 'FIT2085', name: 'Algorithms', term: 'S2 2026', target: { mark: 70, grade: 'D' },
    standing: { doneWeight: 40, average: 72, verdict: 'On course.', onCourse: true, hurdleFailed: false },
    assessments: [
      { id: 1, name: 'Assignment 1', weight: 40, done: true, percent: 72, hurdle: null, hurdleFailed: false, needAtLeast: null },
      { id: 2, name: 'Exam', weight: 60, done: false, percent: null, hurdle: 45, hurdleFailed: false, needAtLeast: 68.7 }
    ]
  }]
};

const find = (tree, id) => {
  if (tree.id === id) return tree;
  for (const child of tree.children) {
    const hit = find(child, id);
    if (hit) return hit;
  }
  return null;
};

test('with no data the tree still has you and this year', () => {
  const tree = lifeTree(empty);
  assert.equal(tree.title, 'You');
  assert.deepEqual(tree.children.map((y) => y.title), ['2026']);
  assert.equal(tree.children[0].now, true);
  assert.equal(tree.children[0].note, 'Nothing recorded');
  assert.ok(Math.abs(tree.children[0].time - 321 / 365) < 0.001);    // 17 November is day 321
});

test('each year with data appears, in order, with its areas', () => {
  const tree = lifeTree({ ...empty, report, transactions: [{ id: 1, what: 'Lunch', amount: 10, date: '2024-03-02', category: 'Food', account: null }] });
  assert.deepEqual(tree.children.map((y) => y.title), ['2024', '2025', '2026']);
  assert.deepEqual(tree.children[0].children.map((a) => a.title), ['Money']);
  assert.equal(tree.children[0].value, 'Finished');
  assert.deepEqual(tree.children[2].children.map((a) => a.title), ['Studies']);
});

test('studies: finished semesters are full; the current one shows work marked and time gone', () => {
  const tree = lifeTree({ ...empty, report, termDates: { start: '2026-07-27', end: '2026-11-27' } });
  const s1 = find(tree, 'life/2025/studies/S1 2025');
  assert.equal(s1.done, 1);
  assert.equal(s1.grade, true);
  assert.equal(find(tree, 'life/2025/studies/S1 2025/ENG1005').tone, 'warn');      // a hurdle fail
  const now = find(tree, 'life/2026/studies/S2 2026');
  assert.equal(now.now, true);
  assert.equal(now.done, 0.4);                                                      // 40% of the one unit is marked
  assert.ok(now.time > 0.9 && now.time < 1);                                        // 114 of 124 days gone
  const exam = find(tree, 'life/2026/studies/S2 2026/FIT2085/2');
  assert.equal(exam.value, 'Need 68.7%');
  assert.equal(exam.note, '60% of the unit · hurdle 45%');
});

test('money: year, month, week, day and each entry, with the month measured against the limit', () => {
  const transactions = [
    { id: 1, what: 'Lunch', amount: 10, date: '2026-11-03', category: 'Food', account: "Touch 'n Go" },
    { id: 2, what: 'Bus', amount: 2.5, date: '2026-11-03', category: 'Transport', account: null },
    { id: 3, what: 'Book', amount: 40, date: '2026-11-16', category: 'Study', account: 'Maybank' }
  ];
  const tree = lifeTree({ ...empty, transactions, limit: 100 });
  const month = find(tree, 'life/2026/money/2026-11');
  assert.equal(month.value, 'RM 52.50');
  assert.equal(month.done, 0.525);
  assert.equal(month.tone, 'good');
  assert.deepEqual(month.children.map((w) => w.title), ['Week 1', 'Week 3']);
  const day = find(tree, 'life/2026/money/2026-11/w1/2026-11-03');
  assert.equal(day.value, 'RM 12.50');
  assert.deepEqual(day.children.map((t) => `${t.title} ${t.note}`), ["Lunch Food · Touch 'n Go", 'Bus Transport']);
  assert.equal(find(tree, 'life/2026/money/2026-11/w3').now, true);                // 17 November is in week 3
});

test('food: month, day, meal and food, with each day measured against the target', () => {
  const foodLog = [
    { id: 1, date: '2026-11-16', meal: 'Lunch', food: 'Chicken rice', kcal: 610, protein: 38 },
    { id: 2, date: '2026-11-16', meal: 'Dinner', food: 'Mee goreng', kcal: 2000, protein: 22 },
    { id: 3, date: '2026-11-17', meal: 'Lunch', food: 'Salad', kcal: 400, protein: 10 }
  ];
  const tree = lifeTree({ ...empty, foodLog, foodTargets: { kcal: 2400, protein: 140 } });
  const month = find(tree, 'life/2026/food/2026-11');
  assert.equal(month.note, '1 at or under your calorie target');
  assert.equal(month.done, 0.5);
  const day = find(tree, 'life/2026/food/2026-11/2026-11-16');
  assert.equal(day.tone, 'warn');                                                   // 2,610 kcal is over 2,400
  assert.deepEqual(day.children.map((m) => m.title), ['Lunch', 'Dinner']);
});

test('health: steps, sleep and workouts on each day', () => {
  const tree = lifeTree({
    ...empty, healthTargets: { steps: 8000 },
    healthDays: [{ day: '2026-11-16', steps: 9000, sleepMinutes: 420, restingHr: 60 }, { day: '2026-11-17', steps: 4000, sleepMinutes: null, restingHr: null }],
    workouts: [{ id: 5, date: '2026-11-16', name: 'Push day', notes: '' }]
  });
  const month = find(tree, 'life/2026/health/2026-11');
  assert.equal(month.value, '1 workout');
  assert.equal(month.done, 0.5);
  const day = find(tree, 'life/2026/health/2026-11/w3/2026-11-16');
  assert.deepEqual(day.children.map((i) => `${i.title}: ${i.value}`), ['Steps: 9,000', 'Sleep: 7 h 00 min', 'Resting heart rate: 60 bpm', 'Push day: Workout']);
});

test('every id in the tree is unique', () => {
  const tree = lifeTree({ ...empty, report, transactions: [{ id: 1, what: 'x', amount: 1, date: '2026-11-03', category: 'Food', account: null }] });
  const ids = [];
  const walk = (n) => { ids.push(n.id); n.children.forEach(walk); };
  walk(tree);
  assert.equal(new Set(ids).size, ids.length);
});
