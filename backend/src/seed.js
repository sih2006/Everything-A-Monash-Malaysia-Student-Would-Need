// Example data, so the app can be tried without typing everything in first.
// Every value here is made up. The unit codes are examples; the weights and
// hurdles are not taken from the Monash handbook.
//
//   npm run seed         fills an empty database with the example data
//
// The same data is loaded by the "Load example data" button in the app.

import { fileURLToPath } from 'node:url';

import { addDays, weekRange } from './domain.js';

export function loadDemo(store, today) {
  // ----- academics -----
  // The made-up semesters follow today's date: this semester is in this year, the finished ones in the year before.
  const year = Number(today.slice(0, 4));
  const thisTerm = `S2 ${year}`, lastYear1 = `S1 ${year - 1}`, lastYear2 = `S2 ${year - 1}`;
  store.setSetting('academics.currentTerm', thisTerm);
  store.setSetting('academics.margin', 10);
  // A made-up semester that started six weeks ago and has six weeks left.
  store.setSetting('academics.termDates', { start: addDays(today, -42), end: addDays(today, 42) });
  store.setSetting('academics.goal', { measure: 'cgpa', value: 3.5, totalCredits: 144 });

  const units = [
    { code: 'FIT2004', name: 'Algorithms and data structures', target: 70,
      assessments: [['Assignment 1', 15, 78], ['Assignment 2', 15, 70], ['Mid-semester test', 10, 65], ['Final exam', 60, null, 45]] },
    { code: 'FIT2099', name: 'Object-oriented design and implementation', target: 80,
      assessments: [['Assignment 1', 20, 74], ['Assignment 2', 25, 68], ['Assignment 3', 25, 70], ['Final exam', 30, null]] },
    { code: 'FIT2094', name: 'Databases', target: 80,
      assessments: [['Assignment 1', 20, 88], ['Quiz', 10, 90], ['Assignment 2', 30, 81], ['Final exam', 40, null]] },
    { code: 'MAT1830', name: 'Discrete mathematics for computer science', target: 60,
      assessments: [['Weekly assignments', 20, 58], ['Mid-semester test', 20, 45], ['Final exam', 60, null, 40]] }
  ];
  for (const u of units) {
    store.insertUnit({ code: u.code, name: u.name, term: thisTerm, credit: 6 });
    store.updateUnit(u.code, { target: u.target });
    for (const [name, weight, score, hurdle] of u.assessments) {
      store.insertAssessment({ unitCode: u.code, name, weight, score, max: 100, hurdle: hurdle ?? null });
    }
  }

  const results = [
    ['FIT1045', 'Introduction to programming', 78, lastYear1], ['FIT1047', 'Computer systems and networks', 72, lastYear1],
    ['FIT1049', 'IT professional practice', 71, lastYear1], ['MAT1841', 'Continuous mathematics', 64, lastYear1],
    ['FIT1008', 'Fundamentals of algorithms', 81, lastYear2], ['FIT1050', 'Web fundamentals', 75, lastYear2],
    ['FIT1055', 'Professional practice and ethics', 72, lastYear2], ['FIT1058', 'Foundations of computing', 66, lastYear2]
  ];
  for (const [code, name, mark, term] of results) store.insertResult({ code, name, credit: 6, mark, grade: null, term });

  // ----- budget: spending over the last three weeks, kept inside the current month -----
  store.setSetting('budget.limit', 1300);
  const limits = { Food: 600, Transport: 200, Groceries: 250, Fun: 150, Study: 100 };
  const categoryId = {};
  for (const [name, limit] of Object.entries(limits)) categoryId[name] = store.insertCategory({ name, limit });

  const spending = [
    [0, 'Nasi lemak, campus canteen', 'Food', 8.5], [0, 'Grab to the mall', 'Transport', 12], [1, 'Weekly groceries', 'Groceries', 46.3],
    [1, 'Cinema ticket', 'Fun', 22], [2, 'Printing', 'Study', 5], [2, 'Chicken rice', 'Food', 9], [3, 'Mamak dinner with friends', 'Food', 24.5],
    [4, 'Monthly train pass', 'Transport', 50], [5, 'Bubble tea', 'Fun', 13.9], [6, 'Lunch set', 'Food', 14], [7, 'Weekly groceries', 'Groceries', 52.8],
    [8, 'Textbook, second hand', 'Study', 45], [9, 'Roti canai breakfast', 'Food', 6.5], [10, 'Karaoke night', 'Fun', 38], [11, 'Grab home', 'Transport', 18.4],
    [12, 'Food court', 'Food', 11.2], [13, 'Weekly groceries', 'Groceries', 41.6], [14, 'Stationery', 'Study', 12.4], [15, 'Dinner out', 'Food', 32], [16, 'Streaming, shared', 'Fun', 15]
  ];
  const monthStart = today.slice(0, 8) + '01';
  // ----- money accounts: made-up balances -----
  const maybank = store.insertAccount({ name: 'Maybank', kind: 'bank' });
  const tng = store.insertAccount({ name: "Touch 'n Go", kind: 'ewallet' });
  const invest = store.insertAccount({ name: 'Investing', kind: 'investment' });
  store.insertAccountMove({ accountId: maybank, kind: 'set', amount: 2340.5, date: monthStart, note: 'Starting balance' });
  store.insertAccountMove({ accountId: tng, kind: 'set', amount: 35.2, date: monthStart, note: 'Starting balance' });
  store.insertAccountMove({ accountId: invest, kind: 'set', amount: 1500, date: monthStart, note: 'Starting balance' });
  store.insertAccountMove({ accountId: maybank, kind: 'out', amount: 100, date: monthStart, note: "To Touch 'n Go" });
  store.insertAccountMove({ accountId: tng, kind: 'in', amount: 100, date: monthStart, note: 'From Maybank' });
  store.insertAccountMove({ accountId: maybank, kind: 'in', amount: 450, date: monthStart, note: 'Allowance' });

  for (const [daysAgo, what, category, amount] of spending) {
    const date = addDays(today, -daysAgo);
    if (date < monthStart) continue;
    const id = store.insertTransaction({ categoryId: categoryId[category], what, amount, date });
    // Small spending is paid with Touch 'n Go, bigger spending from the bank.
    store.insertAccountMove({ accountId: amount < 20 ? tng : maybank, kind: 'out', amount, date, note: what, transactionId: id });
  }

  // ----- food -----
  store.setSetting('food.targets', { kcal: 2400, protein: 140 });
  const foods = [
    ['Grilled chicken with rice', 520, 45], ['Chicken satay, 5 sticks', 250, 24], ['Roti canai with dhal', 360, 9],
    ['Mee goreng mamak', 660, 22], ['Nasi goreng kampung', 640, 21], ['Milo ais', 180, 5], ['Nasi lemak with fried egg', 640, 20], ['Chicken rice', 610, 38]
  ];
  for (const [name, kcal, protein] of foods) store.insertFood({ name, kcal, protein });
  store.insertFoodLog({ date: today, meal: 'Breakfast', food: 'Nasi lemak with fried egg', kcal: 640, protein: 20 });
  store.insertFoodLog({ date: today, meal: 'Lunch', food: 'Chicken rice', kcal: 610, protein: 38 });
  store.insertFoodLog({ date: today, meal: 'Snack', food: 'Teh tarik', kcal: 150, protein: 4 });
  store.insertFoodLog({ date: today, meal: 'Snack', food: 'Banana', kcal: 100, protein: 1 });

  // ----- health: this week, up to today -----
  store.setSetting('health.targets', { steps: 8000, sleepMinutes: 450, workouts: 4, waterMl: 2500, weightGoalKg: 70, heightCm: 175 });
  const { from } = weekRange(today);
  const days = [[7810, 425, 63], [9240, 400, 62], [5130, 450, 64], [8460, 350, 63], [6420, 370, 62], [7200, 480, 61], [4100, 510, 62]];
  const water = [2100, 2600, 1800, 2500, 2300, 2700, 1500];
  days.forEach(([steps, sleepMinutes, restingHr], index) => {
    const day = addDays(from, index);
    if (day <= today) store.saveHealthDay(day, { steps, sleepMinutes, restingHr, waterMl: water[index] });
  });
  // Body weight about twice a week for the last two months, slowly going down.
  for (let back = 60; back >= 0; back -= 3) {
    store.saveHealthDay(addDays(today, -back), { weightKg: Math.round((72.4 - (60 - back) * 0.03 + (back % 2) * 0.2) * 10) / 10 });
  }
  const sessions = [
    { name: 'Pull day', kind: 'gym', minutes: 70, exercises: [
      { name: 'Deadlift', sets: 3, reps: 5, weightKg: 100 }, { name: 'Lat pulldown', sets: 3, reps: 10, weightKg: 50 }, { name: 'Barbell row', sets: 3, reps: 8, weightKg: 55 }] },
    { name: 'Leg day', kind: 'gym', minutes: 65, exercises: [
      { name: 'Squat', sets: 4, reps: 6, weightKg: 85 }, { name: 'Leg press', sets: 3, reps: 12, weightKg: 140 }] },
    { name: 'Evening run', kind: 'run', minutes: 30, exercises: [] },
    { name: 'Push day', kind: 'gym', minutes: 60, exercises: [
      { name: 'Bench press', sets: 4, reps: 6, weightKg: 62.5 }, { name: 'Overhead press', sets: 3, reps: 8, weightKg: 37.5 }] }
  ];
  // Last week too, a little lighter, so the best lifts have a history.
  sessions.forEach((w, index) => {
    const before = addDays(from, index * 2 - 7);
    store.insertWorkout({ ...w, date: before, notes: '', exercises: w.exercises.map((x) => ({ ...x, weightKg: x.weightKg - 2.5 })) });
  });
  sessions.forEach((w, index) => {
    const day = addDays(from, index * 2);
    if (day <= today) store.insertWorkout({ ...w, date: day, notes: '' });
  });
}

// Run directly: fill the database the server uses.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { openDatabase, inTransaction } = await import('./db.js');
  const { createStore } = await import('./store.js');
  const { todayIn } = await import('./domain.js');
  const { config } = await import('./config.js');
  const db = openDatabase(config.dataFile);
  const store = createStore(db);
  if (!store.isEmpty()) {
    console.error(`The database at ${config.dataFile} already has data in it. Nothing was changed.`);
    process.exit(1);
  }
  inTransaction(db, () => loadDemo(store, todayIn()));
  console.log(`Example data loaded into ${config.dataFile}.`);
}
