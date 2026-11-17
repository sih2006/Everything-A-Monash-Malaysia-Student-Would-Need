import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSpan, monthLabel, presentMonthlyTable, spanWords } from '../js/viewmodels/expenses.js';

const byMonth = [
  { month: '2026-08', total: 950, byCategory: { Rent: 900, Food: 50 } },
  { month: '2026-09', total: 980, byCategory: { Rent: 900, Food: 60, Games: 20 } },
  { month: '2026-10', total: 935, byCategory: { Rent: 900, Food: 35 } }
];

test('the month table: one row per category, one column per month, biggest first, inside the period only', () => {
  const t = presentMonthlyTable(byMonth, '2026-09', '2026-10', ['Rent']);
  assert.deepEqual(t.months.map((m) => m.label), ['Sep 2026', 'Oct 2026']);
  assert.deepEqual(t.rows, [
    { category: 'Rent', total: 1800, essential: true, cells: [900, 900] },
    { category: 'Food', total: 95, essential: false, cells: [60, 35] },
    { category: 'Games', total: 20, essential: false, cells: [20, 0] }    // no spending that month shows as 0
  ]);
  assert.equal(t.total, 1915);
});

test('the month table with nothing in the period is empty, not broken', () => {
  assert.deepEqual(presentMonthlyTable(byMonth, '2027-01', '2027-03'), { months: [], rows: [], total: 0 });
  assert.deepEqual(presentMonthlyTable(undefined, '2026-01', '2026-12'), { months: [], rows: [], total: 0 });
});

test('the period in words', () => {
  assert.equal(spanWords('month', { months: 1, from: '2026-10-01' }, 'October 2026'), 'October 2026');
  assert.equal(spanWords('3m', { months: 3, from: '2026-08-01' }, 'October 2026'), 'the last 3 months');
  assert.equal(spanWords('year', { months: 12, from: '2025-11-01' }, 'October 2026'), 'the last 12 months');
  assert.equal(spanWords('all', { months: 17, from: '2025-06-01' }, 'October 2026'), 'all time, since Jun 2025');
  assert.equal(monthLabel('2026-01'), 'Jan 2026');
  assert.ok(isSpan('year') && !isSpan('week'));
});
