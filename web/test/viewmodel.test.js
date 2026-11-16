// Tests for the ViewModel. It has no HTML in it, so these run in Node with no
// browser: the presenters get plain data, and the commands get a fake API.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../js/api.js';
import { typedNumber } from '../js/format.js';
import { createAppViewModel } from '../js/viewmodels/appViewModel.js';
import { MASK, presentGrades, presentHome, presentMap, presentUnit } from '../js/viewmodels/present.js';

// ---------- sample data, in the shape the backend sends ----------

const standing = (over = {}) => ({
  doneCount: 3, totalCount: 4, doneWeight: 40, earned: 28.7, leftWeight: 60, average: 71.75, hurdleFailed: false,
  bestGrade: 'HD', projected: 71.75, projectedGrade: 'D', hasTarget: true, secured: false, possible: true, realistic: true,
  onCourse: true, need: 68.83, needMax: 68.83, basis: 71.75, bestRealisticGrade: 'HD',
  verdict: 'On course. The mark you need is below your average so far.', ...over
});
const unit = (code, over = {}, standingOver = {}) => ({
  code, name: `${code} name`, term: 'S1 2027', credit: 6, totalWeight: 100, target: { mark: 70, grade: 'D' },
  assessments: [
    { id: 1, name: 'Assignment 1', weight: 40, done: true, score: 28.7, max: 40, percent: 71.75, hurdle: null, hurdleFailed: false, needAtLeast: null },
    { id: 2, name: 'Final exam', weight: 60, done: false, score: null, max: 100, percent: null, hurdle: 45, hurdleFailed: false, needAtLeast: 68.83 }
  ],
  standing: standing(standingOver), ...over
});
const report = (units, over = {}) => ({
  currentTerm: 'S1 2027', units,
  attention: units.filter((u) => !u.standing.onCourse).map((u) => ({ code: u.code, reason: u.standing.verdict })),
  terms: [{ term: 'S1 2026', credits: 12, gpa: 2.5, cgpa: 3.26, wam: 71, units: [{ id: 9, index: 0, code: 'FIT1045', name: 'Programming', credit: 6, mark: 78, grade: 'D' }] }],
  finished: { units: 2, credits: 12, gpa: 2.5, cgpa: 3.26, wam: 71 },
  current: { units: 1, credits: 6, gpa: 3, cgpa: 3.67, wam: 71.75 },
  projected: { units: 3, credits: 18, gpa: 2.67, cgpa: 3.4, wam: 71.3 },
  goal: null, settings: { currentTerm: 'S1 2027', margin: 10, goal: null }, ...over
});
const budget = (over = {}) => ({
  month: '2026-11', monthName: 'November 2026', day: 21, days: 30, daysLeft: 9, limit: 1300, hasLimit: true, spent: 1084.5, left: 215.5,
  spentPercent: 83.4, monthPercent: 70, over: false, ahead: true, perDay: 23.94, perDaySoFar: 51.64, verdict: 'Ahead of pace', tone: 'warn', mood: 'stressed',
  categories: [{ id: 1, name: 'Food', limit: 600, spent: 520.4, left: 79.6, over: false, percent: 86.7 }, { id: 2, name: 'Fun', limit: 150, spent: 164.8, left: -14.8, over: true, percent: 109.9 }],
  weeks: [{ name: 'Week 1', days: 'Days 1 to 7', spent: 338.2, state: 'done' }, { name: 'Week 2', days: 'Days 8 to 14', spent: 371.9, state: 'done' }, { name: 'Week 3', days: 'Days 15 to 21', spent: 374.4, state: 'done' }, { name: 'Week 4', days: 'Days 22 to 28', spent: 0, state: 'ahead' }],
  recent: [], ...over
});
const food = (over = {}) => ({
  date: '2026-11-21', targetKcal: 2400, targetProtein: 140, hasTargets: true, kcal: 1500, protein: 63, over: false, left: 900, proteinLeft: 77,
  percent: 62.5, proteinPercent: 45, verdict: 'On target', tone: 'good', mood: 'wants more protein',
  log: [{ id: 1, meal: 'Lunch', food: 'Chicken rice', kcal: 610, protein: 38 }], meals: [{ meal: 'Lunch', kcal: 610, protein: 38, foods: ['Chicken rice'] }],
  foods: [{ id: 5, name: 'Chicken rice', kcal: 610, protein: 38 }], ...over
});
const health = (over = {}) => ({
  date: '2026-11-20', stepTarget: 8000, sleepTargetMinutes: 450, workoutTarget: 4,
  week: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name, i) => ({ name, date: `2026-11-${16 + i}`, today: i === 4, future: i > 4, steps: i < 4 ? 8000 + i * 100 : i === 4 ? 6420 : null, sleepMinutes: null, restingHr: null })),
  steps: 6420, sleepMinutes: 370, restingHr: 62, stepsOk: false, stepsLeft: 1580, sleepShort: 80, restingHrWeek: 63, daysOnTarget: 4, daysLogged: 5,
  workouts: { done: 3, target: 4, list: [] }, ...over
});
const overview = (over = {}) => ({ today: '2026-11-21', academics: report([unit('FIT2004')]), academicsError: null, budget: budget(), food: food(), health: health(), ai: false, empty: false, ...over });

// ---------- presenters ----------

test('a unit shows its numbers as finished text', () => {
  const u = presentUnit(unit('FIT2004'));
  assert.equal(u.targetText, 'D (70)');
  assert.equal(u.earned, '28.7');
  assert.equal(u.average, '71.8%');
  assert.equal(u.need, '68.8%');
  assert.equal(u.state, 'on-course');
  assert.deepEqual(u.chips.map((c) => `${c.text}:${c.tone}`), ['Possible:good', 'Realistic:good']);
  assert.equal(u.assessments[1].needText, 'need 68.8%');
  assert.equal(u.assessments[0].markText, '28.7/40 · 71.8%');
});

test('possible and realistic are two separate chips', () => {
  const u = presentUnit(unit('MAT1830', {}, { realistic: false, onCourse: false }));
  assert.deepEqual(u.chips.map((c) => `${c.text}:${c.tone}`), ['Possible:good', 'Not realistic:warn']);
  assert.equal(u.state, 'not-realistic');
  const out = presentUnit(unit('FIT2099', {}, { possible: false, realistic: false, onCourse: false }));
  assert.deepEqual(out.chips.map((c) => c.text), ['Not possible', 'Not realistic']);
  assert.equal(out.state, 'out-of-reach');
});

test('a failed hurdle replaces the other chips', () => {
  const u = presentUnit(unit('FIT2004', {}, { hurdleFailed: true, possible: false, realistic: false, onCourse: false }));
  assert.deepEqual(u.chips.map((c) => c.text), ['Hurdle failed']);
  assert.equal(u.state, 'failed');
});

test('a unit with no target shows no verdict chips and no need', () => {
  const u = presentUnit(unit('FIT2004', { target: null }, { hasTarget: false, need: null, needMax: null }));
  assert.deepEqual(u.chips, []);
  assert.equal(u.need, null);
  assert.equal(u.targetText, 'not set');
  assert.equal(u.state, 'no-target');
});

test('hiding grades masks every mark, target and result, but not the names', () => {
  const g = presentGrades(report([unit('FIT2004')]), true);
  const text = JSON.stringify(g);
  for (const secret of ['28.7', '71.8', '68.8', 'D (70)', '3.26', '78 D', '71.3']) assert.ok(!text.includes(secret), `${secret} must be hidden`);
  assert.equal(g.stats[0].value, MASK);
  assert.equal(g.units[0].earned, MASK);
  assert.equal(g.units[0].verdict, 'Details hidden.');
  assert.equal(g.units[0].canWhatIf, false);
  assert.equal(g.units[0].code, 'FIT2004');
  assert.equal(g.terms[0].units[0].result, MASK);
});

test('CGPA and GPA are labelled as different scales', () => {
  const g = presentGrades(report([unit('FIT2004')]));
  assert.deepEqual(g.stats.map((s) => `${s.label}=${s.value}`), ['CGPA, Malaysia scale=3.26', 'GPA, standard scale=2.50', 'WAM=71.0']);
  assert.match(g.stats[0].note, /3\.40 if this semester/);
});

test('with nothing finished the stats say so instead of showing 0', () => {
  const g = presentGrades(report([], { terms: [], finished: { units: 0, credits: 0, gpa: 0, cgpa: 0, wam: 0 }, current: null, projected: null }));
  assert.equal(g.stats[0].value, '—');
  assert.equal(g.empty, true);
  assert.equal(g.mood, 'waiting');
});

test('the goal banner explains what is needed, and warns when the semester is short', () => {
  const goal = { measure: 'cgpa', value: 3.5, totalCredits: 144, creditsDone: 48, creditsLeft: 96, need: 3.5, reached: false, reachable: true, defaultTarget: { grade: 'D', mark: 70 }, currentValue: 3.37, gap: -0.13 };
  const g = presentGrades(report([unit('FIT2004')], { goal, settings: { goal } }));
  assert.equal(g.goal.title, 'Final goal: CGPA 3.50 by graduation');
  assert.match(g.goal.text, /average of 3\.50 across the 96 credit points/);
  assert.match(g.goal.text, /default target for each unit is D \(70 or more\)/);
  assert.match(g.goal.text, /0\.13 short/);
  assert.equal(g.goal.tone, 'warn');
  const far = presentGrades(report([], { goal: { ...goal, need: 4.4, reachable: false, defaultTarget: null, gap: null } }));
  assert.match(far.goal.text, /out of reach/);
});

test('the home headline counts units on course and names the ones that are not', () => {
  const two = report([unit('FIT2004'), unit('FIT2099', {}, { possible: false, realistic: false, onCourse: false }), unit('MAT1830', {}, { realistic: false, onCourse: false })]);
  const home = presentHome(overview({ academics: two }));
  assert.equal(home.headline.before + home.headline.strong + home.headline.after, 'One of your three units is on course.');
  assert.match(home.lede, /FIT2099 can no longer reach your target, and MAT1830 needs more than you usually score\./);
  assert.match(home.lede, /spending is running ahead/);
  assert.equal(home.mood, 'distressed');
  assert.equal(home.cards[0].big, '1 of 3');
});

test('the attention list gathers problems from every part', () => {
  const off = report([unit('FIT2099', {}, { possible: false, realistic: false, onCourse: false, verdict: 'HD is out of reach.' })]);
  const home = presentHome(overview({ academics: off }));
  assert.deepEqual(home.attention.map((a) => a.tab), ['grades', 'budget', 'food', 'health']);
  assert.equal(home.attention[0].text, 'FIT2099: HD is out of reach.');
  assert.equal(home.attention[1].text, 'Fun is over its limit by RM 14.80.');
  assert.equal(presentHome(overview({ academics: off }), true).attention[0].text, 'FIT2099: details hidden');
});

test('home works when nothing is set up, and when grades cannot load', () => {
  const blank = overview({
    empty: true, academics: report([], { terms: [], attention: [], finished: { units: 0, credits: 0, gpa: 0, cgpa: 0, wam: 0 }, current: null, projected: null }),
    budget: budget({ hasLimit: false, limit: 0, spent: 0, tone: 'good', categories: [] }), food: food({ hasTargets: false, kcal: 0, log: [], targetProtein: 0 }), health: health({ steps: null, sleepShort: null })
  });
  const home = presentHome(blank);
  assert.equal(home.headline.before, 'Add your first unit to see where you stand.');
  assert.deepEqual(home.cards.map((c) => c.chip.text), ['No targets yet', 'No limit yet', 'No target yet', 'Nothing logged']);
  assert.deepEqual(home.attention, []);
  const broken = presentHome(overview({ academics: null, academicsError: 'The grade engine was not found.' }));
  assert.equal(broken.cards[0].chip.text, 'Not available');
  assert.equal(broken.lede.startsWith('The grade engine was not found.'), true);
});

test('each map runs done, now, ahead, goal, in that order', () => {
  const order = (kind, data = overview()) => presentMap(kind, data).stops.map((s) => s.kind).join(' ');
  assert.equal(order('studies'), 'done now goal');
  assert.equal(order('budget'), 'done done done now ahead goal');
  assert.equal(order('food'), 'done now ahead goal');
  assert.equal(order('health'), 'done done done done now ahead ahead goal');
});

test('the studies map lists each task as done or still to do, with the mark needed', () => {
  const goal = { measure: 'cgpa', value: 3.5, totalCredits: 144, creditsDone: 12, creditsLeft: 132, need: 3.5, reached: false, reachable: true, defaultTarget: { grade: 'D', mark: 70 }, currentValue: 3.67, gap: 0.17 };
  const map = presentMap('studies', overview({ academics: report([unit('FIT2004')], { goal }) }));
  const now = map.stops.find((s) => s.kind === 'now');
  assert.deepEqual(now.tasks[0].done, ['Assignment 1 · 71.8%']);
  assert.deepEqual(now.tasks[0].todo, ['Final exam · need 68.8%']);
  assert.equal(now.tasks[0].chip.text, 'On course');
  assert.equal(map.stops.at(-1).big, '3.50');
  assert.equal(map.stops.filter((s) => s.kind === 'ahead').length, 8);      // capped, so the map stays usable
  const hidden = presentMap('studies', overview({ academics: report([unit('FIT2004')], { goal }) }), true);
  assert.ok(!JSON.stringify(hidden).includes('68.8'));
});

test('maps still work with no targets set', () => {
  const bare = overview({ budget: budget({ hasLimit: false, limit: 0 }), food: food({ hasTargets: false }), health: health({ stepTarget: 0, sleepTargetMinutes: 0, workoutTarget: 0 }) });
  for (const kind of ['budget', 'food', 'health']) assert.equal(presentMap(kind, bare).stops.at(-1).big, '?', kind);
  assert.equal(presentMap('studies', overview({ academics: null, academicsError: 'no engine' })).stops.length, 0);
});

test('typed numbers: empty is null, text is NaN, and 0 stays 0', () => {
  assert.equal(typedNumber(''), null);
  assert.equal(typedNumber('  '), null);
  assert.equal(typedNumber('0'), 0);
  assert.equal(typedNumber(' 12.5 '), 12.5);
  assert.ok(Number.isNaN(typedNumber('twelve')));
});

// ---------- commands, with a fake API ----------

function setup(apiOverrides = {}) {
  const calls = [];
  const saved = new Map();
  const changes = [];
  const record = (name, result) => (...args) => { calls.push([name, ...args]); return Promise.resolve(typeof result === 'function' ? result(...args) : result); };
  const api = { overview: record('overview', overview()), ...apiOverrides };
  for (const name of ['addUnit', 'changeUnit', 'changeAssessment', 'addAssessment', 'saveHealthDay', 'logFood', 'addSpending', 'deleteEverything']) {
    api[name] ??= record(name, { marker: name });
  }
  const vm = createAppViewModel({ api, storage: { get: (k) => saved.get(k) ?? null, set: (k, v) => saved.set(k, v) }, onChange: (state, info) => changes.push(info) });
  return { vm, calls, saved, changes };
}

test('loading puts the overview into the state', async () => {
  const { vm } = setup();
  assert.equal(vm.state.loading, true);
  await vm.load();
  assert.equal(vm.state.loading, false);
  assert.equal(vm.state.overview.academics.units[0].code, 'FIT2004');
});

test('a failed first load is kept as a message, not thrown', async () => {
  const { vm } = setup({ overview: () => Promise.reject(new ApiError(0, 'offline', 'The app could not reach its server.')) });
  await vm.load();
  assert.equal(vm.state.loadError, 'The app could not reach its server.');
});

test('a command sends clean values and puts the answer in the right part of the state', async () => {
  const { vm, calls } = setup();
  await vm.load();
  assert.equal(await vm.addUnit({ code: 'FIT3155', name: 'Advanced', term: 'S1 2027', credit: '' }), true);
  assert.deepEqual(calls.at(-1), ['addUnit', { code: 'FIT3155', name: 'Advanced', term: 'S1 2027', credit: 6 }]);   // empty credit means 6
  assert.deepEqual(vm.state.overview.academics, { marker: 'addUnit' });
  assert.equal(vm.state.notice, 'Unit added.');
  assert.equal(vm.state.busy, false);
});

test('text where a number belongs is stopped before the API is called', async () => {
  const { vm, calls, changes } = setup();
  await vm.load();
  const before = calls.length;
  assert.equal(await vm.addSpending({ what: 'Lunch', category: 'Food', amount: 'twelve' }), false);
  assert.equal(calls.length, before);
  assert.equal(vm.state.error.message, 'The amount must be a number.');
  assert.deepEqual(changes.at(-1), { failed: true });
});

test('an API error becomes a message and the data is left as it was', async () => {
  const { vm } = setup({ addUnit: () => Promise.reject(new ApiError(409, 'exists', 'There is already a unit with the code FIT2004.', 'code')) });
  await vm.load();
  assert.equal(await vm.addUnit({ code: 'FIT2004' }), false);
  assert.deepEqual(vm.state.error, { message: 'There is already a unit with the code FIT2004.', field: 'code' });
  assert.equal(vm.state.overview.academics.units[0].code, 'FIT2004');
});

test('after a failed command, other changes still redraw the screen', async () => {
  // Regression test: "Hide grades" once did nothing while an error message was showing.
  const { vm, changes } = setup({ addUnit: () => Promise.reject(new ApiError(400, 'invalid', 'No.')) });
  await vm.load();
  await vm.addUnit({ code: 'X' });
  assert.deepEqual(changes.at(-1), { failed: true });
  vm.toggleHidden();
  assert.deepEqual(changes.at(-1), {});          // a normal change: the View draws again
  assert.equal(vm.state.error, null);
  assert.equal(vm.state.hidden, true);
});

test('hide grades is remembered', async () => {
  const { vm, saved } = setup();
  vm.toggleHidden();
  assert.equal(saved.get('hideGrades'), '1');
  vm.toggleHidden();
  assert.equal(saved.get('hideGrades'), '0');
});

test('an empty mark clears it; a typed mark is sent with what it is out of', async () => {
  const { vm, calls } = setup();
  await vm.load();
  await vm.saveMark(7, { score: '', max: '100' });
  assert.deepEqual(calls.at(-1), ['changeAssessment', 7, { score: null }]);
  await vm.saveMark(7, { score: '17', max: '20' });
  assert.deepEqual(calls.at(-1), ['changeAssessment', 7, { score: 17, max: 20 }]);
  await vm.setTarget('FIT2004', '');
  assert.deepEqual(calls.at(-1), ['changeUnit', 'FIT2004', { target: null }]);
});

test('today\'s health numbers: only filled boxes are sent, and sleep becomes minutes', async () => {
  const { vm, calls } = setup();
  await vm.load();
  await vm.saveToday({ steps: '', sleepHours: '6', sleepMinutes: '10', restingHr: '' });
  assert.deepEqual(calls.at(-1), ['saveHealthDay', '2026-11-21', { sleepMinutes: 370 }]);
  assert.equal(await vm.saveToday({ steps: '', sleepHours: '', sleepMinutes: '', restingHr: '' }), false);
  assert.equal(vm.state.error.message, 'Fill in at least one box.');
});

test('quick add logs the remembered food', async () => {
  const { vm, calls } = setup();
  await vm.load();
  await vm.quickAddFood('5', 'Dinner');
  assert.deepEqual(calls.at(-1), ['logFood', { food: 'Chicken rice', kcal: 610, protein: 38, meal: 'Dinner' }]);
});

test('deleting everything needs the word delete', async () => {
  const { vm, calls } = setup();
  await vm.load();
  assert.equal(await vm.deleteEverything('yes'), false);
  assert.ok(!calls.some(([name]) => name === 'deleteEverything'));
  assert.equal(await vm.deleteEverything(' Delete '), true);
  assert.ok(calls.some(([name]) => name === 'deleteEverything'));
});

test('a screenshot import saves only the rows the user kept, with the user\'s corrections', async () => {
  const { vm, calls } = setup({ readScreenshot: () => Promise.resolve({ items: [{ name: 'Asignment 1', weight: 20, score: 17, max: 20 }] }) });
  await vm.load();
  await vm.readScreenshot('FIT2004', { base64: 'AAAA', mimeType: 'image/png' });
  assert.equal(vm.state.imported.items.length, 1);
  assert.ok(!calls.some(([name]) => name === 'addAssessment'));           // nothing saved yet
  await vm.confirmImport([{ name: 'Assignment 1', weight: '20', score: '17', max: '20' }, { name: 'Exam', weight: '60', score: '', max: '' }]);
  assert.deepEqual(calls.filter(([name]) => name === 'addAssessment').map((c) => c[2]), [{ name: 'Assignment 1', weight: 20, score: 17, max: 20 }, { name: 'Exam', weight: 60 }]);
  assert.equal(vm.state.imported, null);
});
