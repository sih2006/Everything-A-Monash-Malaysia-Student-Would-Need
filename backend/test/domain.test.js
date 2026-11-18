// Tests for the budget, food and health rules. These are pure functions, so
// the tests need no server and no database.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { accountSummary, addDays, budgetSummary, foodPeriods, incomeSummary, monthlySpending, monthsBetween, reducibleSpending, spendingSpans, foodSummary, healthSummary, isDay, isMonth, monthRange, todayIn, weekRange, weightTrend } from '../src/domain.js';

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

// ---------- money accounts ----------

test('accounts: a set balance replaces what came before; in adds and out takes away, in the order entered', () => {
  const accounts = [{ id: 1, name: 'Maybank', kind: 'bank' }, { id: 2, name: 'TNG', kind: 'ewallet' }, { id: 3, name: 'Invest', kind: 'investment' }];
  const moves = [
    { id: 1, accountId: 1, kind: 'in', amount: 100, date: '2026-11-01', note: '', transactionId: null },
    { id: 2, accountId: 1, kind: 'set', amount: 2000, date: '2026-11-02', note: '', transactionId: null },   // replaces the 100
    { id: 3, accountId: 1, kind: 'out', amount: 50, date: '2026-11-03', note: 'To TNG', transactionId: null },
    { id: 4, accountId: 2, kind: 'in', amount: 50, date: '2026-11-03', note: 'From Maybank', transactionId: null },
    { id: 5, accountId: 2, kind: 'out', amount: 12.5, date: '2026-11-04', note: 'Lunch', transactionId: 9 },
    { id: 6, accountId: 3, kind: 'set', amount: 1500, date: '2026-11-01', note: '', transactionId: null }
  ];
  const s = accountSummary(accounts, moves);
  assert.deepEqual(s.accounts.map((a) => a.balance), [1950, 37.5, 1500]);
  assert.equal(s.total, 3487.5);
  assert.equal(s.spendable, 1987.5);
  assert.equal(s.invested, 1500);
  assert.equal(s.accounts[0].lastSet, '2026-11-02');
  assert.equal(s.accounts[1].recent[0].fromSpending, true);     // newest first
});

test('accounts: an account with no moves is at 0, and a balance can be below 0', () => {
  const s = accountSummary([{ id: 1, name: 'Card', kind: 'bank' }], [{ id: 1, accountId: 1, kind: 'set', amount: -120, date: '2026-11-01', note: '' }]);
  assert.equal(s.accounts[0].balance, -120);
  assert.equal(accountSummary([{ id: 2, name: 'New', kind: 'cash' }], []).accounts[0].balance, 0);
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

test('health: looking at a past day, the later days of that week are not "still to come"', () => {
  const s = healthSummary({ date: '2026-11-17', today: '2026-11-20', targets, days: [], workouts: [] });
  assert.equal(s.week[1].today, true);                    // the day being looked at: Tuesday
  assert.deepEqual(s.week.map((d) => d.future), [false, false, false, false, false, true, true]);
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

test('health: water against its target, and weekly averages that skip empty days', () => {
  const s = healthSummary({
    date: '2026-11-20', targets: { ...targets, waterMl: 2500 }, workouts: [],
    days: [{ day: '2026-11-16', steps: 9000, sleepMinutes: 480 }, { day: '2026-11-18', steps: 6001 }, { day: '2026-11-20', waterMl: 1800, sleepMinutes: 400 }]
  });
  assert.equal(s.waterMl, 1800);
  assert.equal(s.waterLeft, 700);
  assert.equal(s.stepsAverage, 7501);                      // (9000 + 6001) / 2, rounded
  assert.equal(s.sleepAverage, 440);
  assert.equal(health([]).waterLeft, null);                // no target: nothing to judge
});

test('health: minutes and kinds of the workouts this week', () => {
  const s = health([], [
    { id: 1, date: '2026-11-16', name: 'Push', kind: 'gym', minutes: 60 },
    { id: 2, date: '2026-11-17', name: 'Run', kind: 'run', minutes: 30 },
    { id: 3, date: '2026-11-18', name: 'Legs', kind: 'gym', minutes: null }
  ]);
  assert.equal(s.workouts.minutes, 90);
  assert.deepEqual(s.workouts.kinds, [{ kind: 'gym', count: 2, minutes: 60 }, { kind: 'run', count: 1, minutes: 30 }]);
});

test('could cut: essential categories are left out; places are ranked by total with count, average and per month', () => {
  const categories = [{ id: 1, name: 'Rent', essential: true }, { id: 2, name: 'Eating out' }, { id: 3, name: 'Shopping' }];
  const t = (categoryId, what, amount) => ({ categoryId, what, amount, date: '2026-10-01' });
  const r = reducibleSpending({ categories, months: 3, transactions: [
    t(1, 'Rent', 2850), t(2, 'Grab', 30), t(2, 'Grab', 33), t(2, 'Burger King', 9.9), t(3, 'Shopee', 120)
  ] });
  assert.equal(r.total, 192.9);
  assert.equal(r.perMonth, 64.3);
  assert.deepEqual(r.byCategory.map((c) => c.category), ['Shopping', 'Eating out']);
  assert.deepEqual(r.top[1], { what: 'Grab', category: 'Eating out', total: 63, count: 2, average: 31.5, perMonth: 21 });
  assert.deepEqual(r.essential, ['Rent']);
  // Each category lists its places, biggest first.
  assert.deepEqual(r.byCategory[1].places, [
    { what: 'Grab', total: 63, count: 2, perMonth: 21 }, { what: 'Burger King', total: 9.9, count: 1, perMonth: 3.3 }]);
});

test('could cut: after six places in a category, the rest are added up as one', () => {
  const transactions = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ categoryId: 1, what: `Shop ${n}`, amount: 100 - n, date: '2026-10-01' }));
  const places = reducibleSpending({ categories: [{ id: 1, name: 'Food' }], transactions, months: 1 }).byCategory[0].places;
  assert.equal(places.length, 7);
  assert.deepEqual(places[6], { what: '2 other places', total: 185, count: 2, perMonth: 185, rest: true });
});

test('spending by month: the total of each month and what it went on, oldest month first', () => {
  const t = (date, category, amount) => ({ date, category, amount });
  assert.deepEqual(monthlySpending([t('2026-10-03', 'Food', 12), t('2026-09-30', 'Rent', 900), t('2026-10-20', 'Food', 8.5), t('2026-10-21', 'Rent', 900)]), [
    { month: '2026-09', total: 900, byCategory: { Rent: 900 } },
    { month: '2026-10', total: 920.5, byCategory: { Food: 20.5, Rent: 900 } }
  ]);
  assert.deepEqual(monthlySpending([]), []);
});

test('months between two months, counting both ends', () => {
  assert.equal(monthsBetween('2026-01', '2026-03'), 3);
  assert.equal(monthsBetween('2025-11', '2026-02'), 4);
  assert.equal(monthsBetween('2026-05', '2026-05'), 1);
});

test('spending spans: this month, 3 months, a year and all time each end with the month shown', () => {
  const categories = [{ id: 1, name: 'Rent', essential: true }, { id: 2, name: 'Food' }];
  const t = (date, categoryId, amount) => ({ date, categoryId, category: categoryId === 1 ? 'Rent' : 'Food', what: categoryId === 1 ? 'Rent' : 'Lunch', amount });
  const transactions = [t('2025-06-10', 2, 10), t('2026-08-05', 2, 30), t('2026-10-02', 1, 900), t('2026-10-15', 2, 20)];
  const s = spendingSpans({ categories, transactions, month: '2026-10' });
  assert.deepEqual([s.month.spent, s.month.total, s.month.months, s.month.from], [920, 20, 1, '2026-10-01']);
  assert.deepEqual([s['3m'].spent, s['3m'].total, s['3m'].perMonth], [950, 50, 16.67]);
  assert.deepEqual([s.year.spent, s.year.months, s.year.from], [950, 12, '2025-11-01']);
  assert.deepEqual([s.all.spent, s.all.months, s.all.from], [960, 17, '2025-06-01']);   // June 2025 to October 2026
  // Records that start in August: "a year" covers only August to October, so its average is not spread over empty months.
  const short = spendingSpans({ categories, transactions: transactions.slice(1), month: '2026-10' });
  assert.deepEqual([short.year.months, short.year.from, short.year.perMonth], [3, '2026-08-01', 16.67]);
});

test('food periods: today, the week and the month, counting only days with something logged', () => {
  const e = (date, kcal, protein) => ({ date, kcal, protein });
  const log = [e('2026-11-02', 2500, 90), e('2026-11-16', 1800, 120), e('2026-11-17', 1000, 40), e('2026-11-17', 900, 50), e('2026-11-18', 2100, 100), e('2026-11-20', 3000, 10)];
  const p = foodPeriods({ day: '2026-11-18', targets: { kcal: 2000, protein: 100 }, log });
  assert.deepEqual(p.day, { from: '2026-11-18', to: '2026-11-18', length: 1, logged: 1, kcal: 2100, protein: 100, averageKcal: 2100, averageProtein: 100, daysOnTarget: 0, daysProteinMet: 1 });
  // The week of Wednesday 18 November runs Monday 16 to Sunday 22; the 20th is after "today", so it is not counted yet.
  assert.deepEqual([p.week.logged, p.week.averageKcal, p.week.daysOnTarget, p.week.daysProteinMet], [3, 1933, 2, 2]);
  assert.deepEqual([p.month.logged, p.month.length, p.month.kcal], [4, 30, 8300]);
  // With no targets set, there is no verdict, only the numbers.
  assert.equal(foodPeriods({ day: '2026-11-18', targets: { kcal: 0, protein: 0 }, log }).week.daysOnTarget, null);
});

test('income: money in during the month by source, without moves between your own accounts', () => {
  const moves = [
    { kind: 'in', amount: 6050, date: '2026-10-24', note: 'Money from home' },
    { kind: 'in', amount: 13.5, date: '2026-10-08', note: 'Paid back by a friend' },
    { kind: 'in', amount: 10, date: '2026-10-09', note: 'Paid back by a friend' },
    { kind: 'in', amount: 200, date: '2026-10-17', note: 'From Maybank', transfer: true },   // own money moved: not income
    { kind: 'in', amount: 999, date: '2026-09-30', note: 'Money from home' },                // another month
    { kind: 'out', amount: 50, date: '2026-10-10', note: 'Lunch' }
  ];
  const s = incomeSummary(moves, '2026-10', 3333.2);
  assert.equal(s.total, 6073.5);
  assert.equal(s.net, 2740.3);
  assert.deepEqual(s.sources, [{ source: 'Money from home', amount: 6050 }, { source: 'Paid back by a friend', amount: 23.5 }]);
  assert.deepEqual(incomeSummary([], '2026-10', 0), { total: 0, net: 0, sources: [] });
});

test('weight: BMI is weight divided by height in metres squared, once a height is set', () => {
  assert.equal(weightTrend([{ day: '2026-11-18', weightKg: 72.5 }], null, 175).bmi, 23.7);
  assert.equal(weightTrend([{ day: '2026-11-18', weightKg: 72.5 }]).bmi, null);
});

test('weight: latest, change over 30 days and distance to the goal the user set', () => {
  const w = (day, weightKg) => ({ day, weightKg });
  const t = weightTrend([w('2026-09-01', 75), w('2026-10-22', 73.4), w('2026-11-05', 72.9), w('2026-11-20', 72.1)], 70);
  assert.deepEqual(t.latest, { date: '2026-11-20', kg: 72.1 });
  assert.equal(t.change30, -1.3);                          // from 22 Oct, the first weight in the last 30 days
  assert.equal(t.toGoal, 2.1);
  assert.equal(t.points.length, 4);
  assert.equal(weightTrend([w('2026-11-20', 72.1)]).change30, null);   // one weight: no change yet
  assert.equal(weightTrend([]).latest, null);
  assert.equal(weightTrend([w('2026-11-20', 68)], 70).toGoal, -2);    // below the goal
});

test('health: only this week\'s workouts are counted', () => {
  const s = health([], [{ id: 1, date: '2026-11-16', name: 'Pull' }, { id: 2, date: '2026-11-15', name: 'Last week' }]);
  assert.equal(s.workouts.done, 1);
  assert.equal(s.workouts.target, 4);
});
