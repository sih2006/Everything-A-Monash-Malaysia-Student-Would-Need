// Tests for the budget, food and health rules. These are pure functions, so
// the tests need no server and no database.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addDays, budgetSummary, foodSummary, healthSummary, isDay, isMonth, monthRange, todayIn, weekRange } from '../src/domain.js';

// ---------- dates ----------

test('a month knows its first day, last day and length, leap years included', () => {
  assert.deepEqual(monthRange('2026-11'), { from: '2026-11-01', to: '2026-11-30', days: 30 });
  assert.equal(monthRange('2026-02').days, 28);
  assert.equal(monthRange('2028-02').days, 29);
});

test('a week runs from Monday to Sunday', () => {
  assert.deepEqual(weekRange('2026-11-21'), { from: '2026-11-16', to: '2026-11-22' });   // a Saturday
  assert.deepEqual(weekRange('2026-11-16'), { from: '2026-11-16', to: '2026-11-22' });   // the Monday itself
  assert.deepEqual(weekRange('2026-11-22'), { from: '2026-11-16', to: '2026-11-22' });   // the Sunday
});

test('adding days crosses months and years', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2027-01-01', -1), '2026-12-31');
});

test('only real dates and months are accepted', () => {
  assert.ok(isDay('2026-11-21'));
  for (const bad of ['2026-02-30', '2026-13-01', '21-11-2026', '2026-11-1', '', null, 20261121]) assert.ok(!isDay(bad), String(bad));
  assert.ok(isMonth('2026-11'));
  for (const bad of ['2026-13', '2026-00', '2026-1', 'November']) assert.ok(!isMonth(bad), bad);
});

test('today is worked out in Malaysian time', () => {
  // 20:30 UTC on the 15th is already 04:30 on the 16th in Kuala Lumpur.
  assert.equal(todayIn('Asia/Kuala_Lumpur', new Date('2026-11-15T20:30:00Z')), '2026-11-16');
});

// ---------- budget ----------

const categories = [{ id: 1, name: 'Food', limit: 600 }, { id: 2, name: 'Fun', limit: 150 }];
const spend = (amount, date, categoryId = 1) => ({ id: 1, what: 'x', amount, date, categoryId, category: 'x' });
const budget = (overrides) => budgetSummary({ month: '2026-11', today: '2026-11-21', limit: 1000, categories, transactions: [], ...overrides });

test('budget: totals, what is left and the daily amount', () => {
  const s = budget({ transactions: [spend(300, '2026-11-05'), spend(120.5, '2026-11-20', 2), spend(999, '2026-10-31')] });
  assert.equal(s.spent, 420.5);              // the October spending is not counted
  assert.equal(s.left, 579.5);
  assert.equal(s.day, 21);
  assert.equal(s.daysLeft, 9);
  assert.equal(s.perDay, 64.39);             // 579.5 / 9
  assert.equal(s.perDaySoFar, 20.02);        // 420.5 / 21
  assert.equal(s.categories[1].spent, 120.5);
  assert.equal(s.categories[1].left, 29.5);
});

test('budget: "ahead of pace" starts just past 5 points above the calendar', () => {
  // Day 21 of 30 is 70% of the month, so the edge is 75% of the limit: RM 750.
  assert.equal(budget({ transactions: [spend(750, '2026-11-10')] }).verdict, 'On pace');
  assert.equal(budget({ transactions: [spend(750.01, '2026-11-10')] }).verdict, 'Ahead of pace');
});

test('budget: spending exactly the limit is not over; one sen more is', () => {
  assert.equal(budget({ transactions: [spend(1000, '2026-11-10')] }).over, false);
  const over = budget({ transactions: [spend(1000.01, '2026-11-10')] });
  assert.equal(over.over, true);
  assert.equal(over.verdict, 'Over your limit');
  assert.equal(over.perDay, 0);              // nothing left to spend per day
});

test('budget: a category over its own limit is flagged', () => {
  const s = budget({ transactions: [spend(150, '2026-11-03', 2)] });
  assert.equal(s.categories[1].over, false);
  assert.equal(budget({ transactions: [spend(150.01, '2026-11-03', 2)] }).categories[1].over, true);
});

test('budget: with no overall limit the category limits are added up', () => {
  assert.equal(budget({ limit: null }).limit, 750);
  const none = budgetSummary({ month: '2026-11', today: '2026-11-21', limit: null, categories: [], transactions: [] });
  assert.equal(none.hasLimit, false);
  assert.equal(none.verdict, 'No limit set');
});

test('budget: weeks split the month and know if they are done, now or ahead', () => {
  const s = budget({ transactions: [spend(10, '2026-11-07'), spend(20, '2026-11-08'), spend(5, '2026-11-29')] });
  assert.deepEqual(s.weeks.map((w) => [w.days, w.spent, w.state]), [
    ['Days 1 to 7', 10, 'done'], ['Days 8 to 14', 20, 'done'], ['Days 15 to 21', 0, 'done'], ['Days 22 to 28', 0, 'ahead'], ['Days 29 to 30', 5, 'ahead']
  ]);
  assert.equal(budget({ today: '2026-11-20' }).weeks[2].state, 'now');
});

test('budget: a past month is complete and a future month has not started', () => {
  assert.equal(budget({ today: '2026-12-03' }).day, 30);
  assert.equal(budget({ today: '2026-12-03' }).daysLeft, 0);
  assert.equal(budget({ today: '2026-10-31' }).day, 0);
});

// ---------- food ----------

const eat = (kcal, protein, meal = 'Lunch', food = 'x') => ({ id: 1, meal, food, kcal, protein });
const food = (log, targets = { kcal: 2400, protein: 140 }) => foodSummary({ date: '2026-11-21', targets, log, foods: [] });

test('food: totals and what is left', () => {
  const s = food([eat(640, 20, 'Breakfast'), eat(610, 38), eat(150, 4, 'Snack'), eat(100, 1, 'Snack')]);
  assert.equal(s.kcal, 1500);
  assert.equal(s.protein, 63);
  assert.equal(s.left, 900);
  assert.equal(s.proteinLeft, 77);
  assert.equal(s.verdict, 'On target');
  assert.equal(s.mood, 'wants more protein');
});

test('food: eating exactly the target is on target; one more kcal is over', () => {
  assert.equal(food([eat(2400, 0)]).over, false);
  assert.equal(food([eat(2401, 0)]).over, true);
  assert.equal(food([eat(2401, 0)]).mood, 'concerned');
});

test('food: meals are grouped in the order they were first logged', () => {
  const s = food([eat(100, 1, 'Snack', 'Banana'), eat(600, 30, 'Lunch', 'Rice'), eat(150, 4, 'Snack', 'Teh tarik')]);
  assert.deepEqual(s.meals.map((m) => [m.meal, m.kcal, m.foods]), [['Snack', 250, ['Banana', 'Teh tarik']], ['Lunch', 600, ['Rice']]]);
});

test('food: with no target set nothing is judged', () => {
  const s = food([eat(5000, 0)], { kcal: 0, protein: 0 });
  assert.equal(s.verdict, 'No target set');
  assert.equal(s.over, false);
});

test('food: reaching the protein target makes the mascot proud', () => {
  assert.equal(food([eat(1000, 140)]).mood, 'proud');
});

// ---------- health ----------

const targets = { steps: 8000, sleepMinutes: 450, workouts: 4 };
const health = (days, workouts = [], date = '2026-11-20') => healthSummary({ date, targets, days, workouts });

test('health: the week has seven days and marks today and the days still to come', () => {
  const s = health([]);
  assert.deepEqual(s.week.map((d) => d.name), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  assert.equal(s.week[4].today, true);                    // 20 November 2026 is a Friday
  assert.deepEqual(s.week.map((d) => d.future), [false, false, false, false, false, true, true]);
  assert.equal(s.steps, null);                            // nothing logged is "no data", not zero
});

test('health: reaching the step target exactly counts', () => {
  assert.equal(health([{ day: '2026-11-20', steps: 8000 }]).stepsOk, true);
  const short = health([{ day: '2026-11-20', steps: 7999 }]);
  assert.equal(short.stepsOk, false);
  assert.equal(short.stepsLeft, 1);
});

test('health: sleep shortfall, average heart rate and days on target', () => {
  const s = health([
    { day: '2026-11-16', steps: 9000, sleepMinutes: 480, restingHr: 60 },
    { day: '2026-11-17', steps: 5000, sleepMinutes: 400, restingHr: 64 },
    { day: '2026-11-20', steps: 8200, sleepMinutes: 370, restingHr: 62 }
  ]);
  assert.equal(s.sleepShort, 80);
  assert.equal(s.restingHrWeek, 62);
  assert.equal(s.daysOnTarget, 2);
  assert.equal(s.daysLogged, 3);
});

test('health: only this week\'s workouts are counted', () => {
  const s = health([], [{ id: 1, date: '2026-11-16', name: 'Pull' }, { id: 2, date: '2026-11-15', name: 'Last week' }]);
  assert.equal(s.workouts.done, 1);
  assert.equal(s.workouts.target, 4);
});
