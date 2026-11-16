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
  store.setSetting('academics.currentTerm', 'S1 2027');
  store.setSetting('academics.margin', 10);
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
    store.insertUnit({ code: u.code, name: u.name, term: 'S1 2027', credit: 6 });
    store.updateUnit(u.code, { target: u.target });
    for (const [name, weight, score, hurdle] of u.assessments) {
      store.insertAssessment({ unitCode: u.code, name, weight, score, max: 100, hurdle: hurdle ?? null });
    }
  }

  const results = [
    ['FIT1045', 'Introduction to programming', 78, 'S1 2026'], ['FIT1047', 'Computer systems and networks', 72, 'S1 2026'],
    ['FIT1049', 'IT professional practice', 71, 'S1 2026'], ['MAT1841', 'Continuous mathematics', 64, 'S1 2026'],
    ['FIT1008', 'Fundamentals of algorithms', 81, 'S2 2026'], ['FIT1050', 'Web fundamentals', 75, 'S2 2026'],
    ['FIT1055', 'Professional practice and ethics', 72, 'S2 2026'], ['FIT1058', 'Foundations of computing', 66, 'S2 2026']
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
  for (const [daysAgo, what, category, amount] of spending) {
    const date = addDays(today, -daysAgo);
    if (date >= monthStart) store.insertTransaction({ categoryId: categoryId[category], what, amount, date });
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
  store.setSetting('health.targets', { steps: 8000, sleepMinutes: 450, workouts: 4 });
  const { from } = weekRange(today);
  const days = [[7810, 425, 63], [9240, 400, 62], [5130, 450, 64], [8460, 350, 63], [6420, 370, 62], [7200, 480, 61], [4100, 510, 62]];
  days.forEach(([steps, sleepMinutes, restingHr], index) => {
    const day = addDays(from, index);
    if (day <= today) store.saveHealthDay(day, { steps, sleepMinutes, restingHr });
  });
  ['Pull day', 'Leg day', 'Push day'].forEach((name, index) => {
    const day = addDays(from, index * 2);
    if (day <= today) store.insertWorkout({ date: day, name, notes: '' });
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
