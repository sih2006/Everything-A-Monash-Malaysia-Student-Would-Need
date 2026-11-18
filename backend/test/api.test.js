// Integration tests: a real server, a real (in-memory) database and the real
// C++ engine, called over HTTP the way the web app calls them.
// Only two things are faked: the date (so the answers do not change day to day)
// and the AI service (so no key and no internet are needed).
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createApp } from '../src/api.js';
import { openDatabase } from '../src/db.js';
import { createEngine } from '../src/engine.js';
import { createGemini } from '../src/gemini.js';
import { createStore } from '../src/store.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const enginePath = process.env.TRACKER_ENGINE ?? path.join(root, 'core', 'build', `tracker${process.platform === 'win32' ? '.exe' : ''}`);
const TODAY = '2026-11-20';   // a Friday

if (!existsSync(enginePath)) {
  throw new Error(`The grade engine is not built at ${enginePath}. Build the core first, then run these tests.`);
}

// Starts a fresh app on a free port. Each group of tests gets its own, so tests cannot affect each other.
async function start(options = {}) {
  const db = openDatabase(':memory:');
  const store = createStore(db);
  const webDir = mkdtempSync(path.join(os.tmpdir(), 'web-'));
  writeFileSync(path.join(webDir, 'index.html'), '<!doctype html><title>test page</title>');
  const app = createApp({
    db, store, webDir,
    engine: createEngine(options.enginePath ?? enginePath),
    gemini: createGemini({ apiKey: options.geminiKey ?? '', fetchImpl: options.fetchImpl }),
    rates: options.rates ?? null,
    today: () => TODAY,
    token: options.token ?? '',
    now: options.now
  });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  // Calls the API and returns { status, body }.
  async function call(method, address, body, headers = {}) {
    if (method !== 'GET' && body === undefined) body = {};      // every change is sent as JSON, like the web app does
    const response = await fetch(base + address, {
      method,
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
    });
    const text = await response.text();
    let parsed = text;
    try { parsed = JSON.parse(text); } catch { /* not JSON: keep the text */ }
    return { status: response.status, body: parsed, headers: response.headers };
  }
  return { call, store, base, close: () => new Promise((resolve) => server.close(resolve)) };
}

// Adds the unit used in several tests: earned 28.7 of 40, average 71.75%.
async function addFit2004(call) {
  await call('POST', '/api/units', { code: 'fit2004', name: 'Algorithms and data structures', term: 'S1 2027' });
  for (const [name, weight, score] of [['Assignment 1', 15, 78], ['Assignment 2', 15, 70], ['Mid-semester test', 10, 65]]) {
    await call('POST', '/api/units/FIT2004/assessments', { name, weight, score });
  }
  return call('POST', '/api/units/FIT2004/assessments', { name: 'Final exam', weight: 60, hurdle: 45 });
}

describe('academics', () => {
  let app;
  before(async () => { app = await start(); });
  after(() => app.close());

  test('an empty app gives an empty report, not an error', async () => {
    const { status, body } = await app.call('GET', '/api/academics');
    assert.equal(status, 200);
    assert.deepEqual(body.units, []);
    assert.equal(body.goal, null);
  });

  test('a unit is added with its code in capitals and comes back in the report', async () => {
    const { status, body } = await addFit2004(app.call);
    assert.equal(status, 200);
    const unit = body.units[0];
    assert.equal(unit.code, 'FIT2004');
    assert.equal(unit.assessments.length, 4);
    assert.equal(unit.standing.earned, 28.7);
    assert.equal(unit.standing.average, 71.75);
    assert.equal(typeof unit.assessments[0].id, 'number');
  });

  test('the same code twice is refused', async () => {
    const { status, body } = await app.call('POST', '/api/units', { code: 'FIT2004', name: 'Again' });
    assert.equal(status, 409);
    assert.equal(body.error.field, 'code');
  });

  test('bad input is refused with a message that names the field', async () => {
    for (const [unit, field] of [[{ code: '' }, 'code'], [{ code: 'FIT 2004' }, 'code'], [{ code: 'X1', credit: 0 }, 'credit'], [{ code: 'X1', credit: 'six' }, 'credit'], [{ code: 'X1', name: 'a\tb' }, 'name']]) {
      const { status, body } = await app.call('POST', '/api/units', unit);
      assert.equal(status, 400, JSON.stringify(unit));
      assert.equal(body.error.field, field);
    }
  });

  test('setting a target gives the mark needed and both verdicts', async () => {
    const { body } = await app.call('PATCH', '/api/units/FIT2004', { target: 70 });
    const s = body.units[0].standing;
    assert.ok(Math.abs(s.need - 68.8333) < 0.001);
    assert.equal(s.possible, true);
    assert.equal(s.realistic, true);
    assert.equal(body.units[0].target.grade, 'D');
    assert.equal(body.units[0].assessments[3].needAtLeast.toFixed(1), '68.8');
  });

  test('the engine decides what is valid: weights above 100% are refused and nothing is stored', async () => {
    const { status, body } = await app.call('POST', '/api/units/FIT2004/assessments', { name: 'One too many', weight: 1 });
    assert.equal(status, 400);
    assert.match(body.error.message, /above 100%/);
    const after = await app.call('GET', '/api/academics');
    assert.equal(after.body.units[0].assessments.length, 4);   // the change was rolled back
  });

  test('a mark above the marks available is refused and rolled back', async () => {
    const id = (await app.call('GET', '/api/academics')).body.units[0].assessments[3].id;
    const { status } = await app.call('PATCH', `/api/assessments/${id}`, { score: 120, max: 100 });
    assert.equal(status, 400);
    assert.equal((await app.call('GET', '/api/academics')).body.units[0].assessments[3].done, false);
  });

  test('what-if answers without saving anything', async () => {
    const { body } = await app.call('GET', '/api/academics/whatif?unit=fit2004&score=69');
    assert.equal(body.finalMark, 70.1);
    assert.equal(body.grade, 'D');
    assert.equal(body.reachesTarget, true);
    assert.equal((await app.call('GET', '/api/academics/whatif?unit=NOPE&score=50')).status, 404);
    assert.equal((await app.call('GET', '/api/academics/whatif?unit=FIT2004&score=101')).status, 400);
  });

  test('a mark below the hurdle fails the unit even when the total is a pass', async () => {
    const id = (await app.call('GET', '/api/academics')).body.units[0].assessments[3].id;
    const { body } = await app.call('PATCH', `/api/assessments/${id}`, { score: 44 });
    assert.equal(body.units[0].standing.hurdleFailed, true);
    assert.equal(body.units[0].standing.projectedGrade, 'NH');
    assert.equal(body.attention[0].code, 'FIT2004');
    await app.call('PATCH', `/api/assessments/${id}`, { score: null });   // put it back to "not done"
  });

  test('finished units give GPA, CGPA and WAM by semester, on two different scales', async () => {
    await app.call('POST', '/api/results', { code: 'FIT1045', name: 'Programming', mark: 78, term: 'S1 2026' });
    const { body } = await app.call('POST', '/api/results', { code: 'FIT1047', name: 'Systems', mark: 47, grade: 'np', term: 'S1 2026' });
    // D and NP, 6 points each: GPA (3 + 0.7) / 2 = 1.85, CGPA (3.67 + 1.7) / 2 = 2.685, WAM 62.5
    assert.equal(body.terms[0].gpa, 1.85);
    assert.equal(body.terms[0].cgpa, 2.685);
    assert.equal(body.terms[0].wam, 62.5);
    assert.equal(body.terms[0].units[1].grade, 'NP');
    assert.equal(typeof body.terms[0].units[0].id, 'number');
    assert.equal((await app.call('POST', '/api/results', { code: 'X1', mark: 101 })).status, 400);
    assert.equal((await app.call('POST', '/api/results', { code: 'X1', mark: 50, grade: 'A+' })).status, 400);
  });

  test('a final goal gives the average needed and a default target', async () => {
    const { status, body } = await app.call('PUT', '/api/academics/settings', { goal: { measure: 'CGPA', value: 3, totalCredits: 48 } });
    assert.equal(status, 200);
    // Points so far: (3.67 + 1.7) x 6 = 32.22. Needed: (144 - 32.22) / 36 = 3.105, so the default target is D.
    assert.ok(Math.abs(body.goal.need - 3.105) < 0.001);
    assert.equal(body.goal.defaultTarget.grade, 'D');
    assert.equal(body.settings.goal.measure, 'cgpa');
    assert.equal((await app.call('PUT', '/api/academics/settings', { goal: { measure: 'cgpa', value: 5, totalCredits: 48 } })).status, 400);
    assert.equal((await app.call('PUT', '/api/academics/settings', { goal: null })).body.goal, null);
  });

  test('the name, semester and credit points of a unit can be changed; its marks stay', async () => {
    const { status, body } = await app.call('PATCH', '/api/units/FIT2004', { name: 'Algorithms', term: 'S2 2027', credit: 12 });
    assert.equal(status, 200);
    const unit = body.units.find((u) => u.code === 'FIT2004');
    assert.deepEqual([unit.name, unit.term, unit.credit], ['Algorithms', 'S2 2027', 12]);
    assert.equal(unit.standing.earned, 28.7);
    assert.equal((await app.call('PATCH', '/api/units/FIT2004', { credit: 0 })).status, 400);
    await app.call('PATCH', '/api/units/FIT2004', { credit: 6 });
  });

  test('predicted marks from the sliders give the semester totals; nothing is saved', async () => {
    await app.call('POST', '/api/units', { code: 'FIT3170', name: 'Project', term: 'S2 2026' });
    await app.call('POST', '/api/units/FIT3170/assessments', { name: 'Report', weight: 50, score: 80, max: 100 });
    const plain = (await app.call('GET', '/api/academics')).body;
    assert.equal(plain.predicted, null);
    const low = await app.call('GET', '/api/academics/predict?u=FIT3170:20');
    const high = await app.call('GET', '/api/academics/predict?u=fit3170:90');
    assert.equal(low.status, 200);
    assert.equal(low.body.whatIf[0].finalMark, 50);                       // 40 earned + 20% of the last 50
    assert.ok(high.body.predicted.wam > low.body.predicted.wam);
    assert.equal(high.body.whatIf[0].code, 'FIT3170');
    assert.deepEqual((await app.call('GET', '/api/academics')).body.units.find((u) => u.code === 'FIT3170').assessments.length, 1);   // nothing saved
    assert.equal((await app.call('GET', '/api/academics/predict')).status, 400);
    assert.equal((await app.call('GET', '/api/academics/predict?u=FIT3170:150')).status, 400);
    assert.equal((await app.call('GET', '/api/academics/predict?u=NOPE1000:50')).status, 404);
    await app.call('DELETE', '/api/units/FIT3170');
  });

  test('a unit can be marked pass or fail only; then it never counts in GPA, CGPA or WAM', async () => {
    const before = (await app.call('GET', '/api/academics')).body.current;
    await app.call('POST', '/api/units', { code: 'FIT2107', name: 'Software quality', term: 'S2 2026' });
    await app.call('POST', '/api/units/FIT2107/assessments', { name: 'Pass tasks', weight: 100, score: 40, max: 100 });
    const counted = (await app.call('GET', '/api/academics')).body.current;
    assert.notDeepEqual(counted, before);                                 // a 40 (N) counts while it is a normal unit
    const { status, body } = await app.call('PATCH', '/api/units/FIT2107', { passFail: true });
    assert.equal(status, 200);
    const unit = body.units.find((u) => u.code === 'FIT2107');
    assert.equal(unit.passFail, true);
    assert.match(unit.standing.verdict, /does not change your GPA/);
    assert.deepEqual(body.current, before);                               // back to what it was without FIT2107
    assert.equal((await app.call('PATCH', '/api/units/FIT2107', { passFail: 'yes' })).status, 400);
    await app.call('DELETE', '/api/units/FIT2107');
  });

  test('deleting a unit removes its assessments too', async () => {
    await app.call('POST', '/api/units', { code: 'TMP1000' });
    await app.call('POST', '/api/units/TMP1000/assessments', { name: 'Quiz', weight: 10 });
    const { body } = await app.call('DELETE', '/api/units/TMP1000');
    assert.equal(body.units.find((u) => u.code === 'TMP1000'), undefined);
    assert.equal(app.store.listAssessments().filter((a) => a.unitCode === 'TMP1000').length, 0);
    assert.equal((await app.call('DELETE', '/api/units/TMP1000')).status, 404);
  });

  test('a finished unit can be removed', async () => {
    const id = (await app.call('GET', '/api/academics')).body.terms[0].units[0].id;
    const { body } = await app.call('DELETE', `/api/results/${id}`);
    assert.equal(body.terms[0].units.length, 1);
    assert.equal((await app.call('DELETE', `/api/results/${id}`)).status, 404);
  });
});

describe('budget', () => {
  let app;
  before(async () => { app = await start(); });
  after(() => app.close());

  test('with nothing set up the summary still loads', async () => {
    const { status, body } = await app.call('GET', '/api/budget');
    assert.equal(status, 200);
    assert.equal(body.hasLimit, false);
    assert.equal(body.month, '2026-11');
  });

  test('categories, a limit and spending give the totals', async () => {
    await app.call('PUT', '/api/budget/settings', { limit: 1000 });
    await app.call('POST', '/api/budget/categories', { name: 'Food', limit: 600 });
    await app.call('POST', '/api/transactions', { what: 'Lunch', amount: 12.5, category: 'food' });
    const { body } = await app.call('POST', '/api/transactions', { what: 'Dinner', amount: 30, category: 'Food', date: '2026-11-03' });
    assert.equal(body.spent, 42.5);
    assert.equal(body.left, 957.5);
    assert.equal(body.categories[0].spent, 42.5);
    assert.equal(body.recent[0].what, 'Lunch');       // newest first
    assert.equal(body.weeks[0].spent, 30);
  });

  test('spending is checked: amount, category and date', async () => {
    const bad = [
      [{ what: 'x', amount: 0, category: 'Food' }, 'amount'], [{ what: 'x', amount: -5, category: 'Food' }, 'amount'],
      [{ what: '', amount: 5, category: 'Food' }, 'what'], [{ what: 'x', amount: 5, category: 'Nope' }, 'category'],
      [{ what: 'x', amount: 5, category: 'Food', date: '2026-11-21' }, 'date'],      // tomorrow
      [{ what: 'x', amount: 5, category: 'Food', date: '21/11/2026' }, 'date']
    ];
    for (const [entry, field] of bad) {
      const { status, body } = await app.call('POST', '/api/transactions', entry);
      assert.equal(status, 400, JSON.stringify(entry));
      assert.equal(body.error.field, field);
    }
  });

  test('a category name cannot be used twice; a category can be changed and removed', async () => {
    assert.equal((await app.call('POST', '/api/budget/categories', { name: 'FOOD', limit: 1 })).status, 409);
    const id = (await app.call('GET', '/api/budget')).body.categories[0].id;
    assert.equal((await app.call('PATCH', `/api/budget/categories/${id}`, { limit: 650 })).body.categories[0].limit, 650);
    const entry = (await app.call('GET', '/api/budget')).body.recent[0].id;
    assert.equal((await app.call('DELETE', `/api/transactions/${entry}`)).body.spent, 30);
    assert.equal((await app.call('DELETE', `/api/budget/categories/${id}`)).body.categories.length, 0);
    assert.equal((await app.call('DELETE', `/api/budget/categories/${id}`)).status, 404);
  });

  test('another month can be asked for; a bad month is refused', async () => {
    assert.equal((await app.call('GET', '/api/budget?month=2026-10')).body.day, 31);
    assert.equal((await app.call('GET', '/api/budget?month=october')).status, 400);
  });
});

describe('money accounts', () => {
  let app;
  before(async () => { app = await start(); });
  after(() => app.close());

  test('accounts with a starting balance, a manual overwrite, income and a move between them', async () => {
    await app.call('POST', '/api/accounts', { name: 'Maybank', kind: 'bank', balance: 2340.5 });
    await app.call('POST', '/api/accounts', { name: "Touch 'n Go", kind: 'ewallet', balance: 20 });
    let { body } = await app.call('POST', '/api/accounts', { name: 'Investing', kind: 'investment', balance: 1500 });
    assert.equal(body.money.total, 3860.5);
    const [maybank, tng] = body.money.accounts;

    body = (await app.call('POST', '/api/accounts/transfer', { from: maybank.id, to: tng.id, amount: 50 })).body;
    assert.deepEqual(body.money.accounts.map((a) => a.balance), [2290.5, 70, 1500]);
    assert.equal(body.money.total, 3860.5);                           // moving money is not spending

    body = (await app.call('POST', `/api/accounts/${maybank.id}/income`, { amount: 300, note: 'Part-time job' })).body;
    assert.equal(body.money.accounts[0].balance, 2590.5);

    body = (await app.call('PUT', `/api/accounts/${maybank.id}/balance`, { balance: 2500 })).body;
    assert.equal(body.money.accounts[0].balance, 2500);               // the overwrite wins
    assert.equal(body.money.spendable, 2570);
  });

  test('spending paid from an account takes it down, and deleting the spending puts it back', async () => {
    await app.call('POST', '/api/budget/categories', { name: 'Food', limit: 600 });
    const tng = (await app.call('GET', '/api/budget')).body.money.accounts[1];
    let { body } = await app.call('POST', '/api/transactions', { what: 'Nasi lemak', amount: 8.5, category: 'Food', accountId: tng.id });
    assert.equal(body.money.accounts[1].balance, 61.5);
    assert.equal(body.recent[0].account, "Touch 'n Go");
    body = (await app.call('DELETE', `/api/transactions/${body.recent[0].id}`)).body;
    assert.equal(body.money.accounts[1].balance, 70);
    // Spending with no account still works and changes no balance.
    body = (await app.call('POST', '/api/transactions', { what: 'Cash snack', amount: 3, category: 'Food' })).body;
    assert.equal(body.money.total, 4070);
    assert.equal(body.recent[0].account, null);
  });

  test('a move from spending cannot be removed on its own; other moves can', async () => {
    const tng = (await app.call('GET', '/api/budget')).body.money.accounts[1];
    await app.call('POST', '/api/transactions', { what: 'Bus', amount: 2, category: 'Food', accountId: tng.id });
    const moves = (await app.call('GET', '/api/budget')).body.money.accounts[1].recent;
    assert.equal((await app.call('DELETE', `/api/account-moves/${moves[0].id}`)).status, 400);
    assert.equal((await app.call('DELETE', `/api/account-moves/${moves[1].id}`)).status, 200);
  });

  test('the month shows money in and what is left; a move between your own accounts is not income', async () => {
    const bank = (await app.call('POST', '/api/accounts', { name: 'Income bank', kind: 'bank', balance: 0 })).body.money.accounts.find((a) => a.name === 'Income bank');
    const wallet = (await app.call('POST', '/api/accounts', { name: 'Income wallet', kind: 'ewallet', balance: 0 })).body.money.accounts.find((a) => a.name === 'Income wallet');
    await app.call('POST', `/api/accounts/${bank.id}/income`, { amount: 500, note: 'Allowance', date: '2026-11-03' });
    const after = await app.call('POST', '/api/accounts/transfer', { from: bank.id, to: wallet.id, amount: 100, date: '2026-11-04' });
    assert.equal(after.status, 200);
    const month = (await app.call('GET', '/api/budget?month=2026-11')).body;
    assert.ok(month.income.sources.some((s) => s.source === 'Allowance' && s.amount === 500));
    assert.ok(!month.income.sources.some((s) => s.source.startsWith('From ')));     // the transfer is not income
    assert.equal(month.income.net, Math.round((month.income.total - month.spent) * 100) / 100);
    await app.call('DELETE', `/api/accounts/${bank.id}`);
    await app.call('DELETE', `/api/accounts/${wallet.id}`);
  });

  test('a category can be marked essential; the month lists what could be cut and keeps saved advice', async () => {
    await app.call('POST', '/api/budget/categories', { name: 'Housing', limit: 0, essential: true });
    const after = await app.call('POST', '/api/budget/categories', { name: 'Treats', limit: 0 });
    const treats = after.body.categories.find((c) => c.name === 'Treats');
    assert.equal(after.body.categories.find((c) => c.name === 'Housing').essential, true);
    await app.call('POST', '/api/transactions', { category: 'Housing', what: 'Rent', amount: 2850, date: '2026-11-02' });
    await app.call('POST', '/api/transactions', { category: 'Treats', what: 'Bubble tea', amount: 12, date: '2026-11-03' });
    const month = (await app.call('GET', '/api/budget?month=2026-11')).body;
    assert.ok(month.reducible.top.some((p) => p.what === 'Bubble tea'));
    assert.deepEqual(Object.keys(month.spans), ['month', '3m', 'year', 'all']);
    assert.equal(month.spans.month.spent, month.spent);                             // everything this month, rent included ...
    assert.equal(month.spans.month.spent - month.spans.month.total, 2850);          // ... but rent is not something to cut
    const november = month.byMonth.at(-1);
    assert.deepEqual([november.month, november.total, november.byCategory.Housing, november.byCategory.Treats], ['2026-11', month.spent, 2850, 12]);
    assert.ok(!month.reducible.top.some((p) => p.what === 'Rent'));                  // essential: never "could cut"
    assert.equal((await app.call('PATCH', `/api/budget/categories/${treats.id}`, { essential: 'yes' })).status, 400);
    const saved = (await app.call('PUT', '/api/budget/advice', { text: 'Line one.\nLine two.', by: 'Claude' })).body;
    assert.deepEqual([saved.advice.text, saved.advice.by], ['Line one.\nLine two.', 'Claude']);
    assert.equal((await app.call('PUT', '/api/budget/advice', { text: null })).body.advice, null);
  });

  test('a balance set for an earlier day keeps the moves after that day, even ones entered before it', async () => {
    const made = (await app.call('POST', '/api/accounts', { name: 'Wallet', kind: 'ewallet' })).body;
    const id = made.money.accounts.find((a) => a.name === 'Wallet').id;
    await app.call('POST', `/api/accounts/${id}/income`, { amount: 100, date: '2026-03-01' });
    await app.call('PUT', `/api/accounts/${id}/balance`, { balance: 15, date: '2026-01-01' });
    await app.call('POST', `/api/accounts/${id}/income`, { amount: 5, date: '2025-12-01' });   // before the set: it no longer counts
    const after = (await app.call('GET', '/api/budget')).body;
    assert.equal(after.money.accounts.find((a) => a.id === id).balance, 115);
    await app.call('DELETE', `/api/accounts/${id}`);
  });

  test('accounts are checked', async () => {
    assert.equal((await app.call('POST', '/api/accounts', { name: 'maybank' })).status, 409);
    assert.equal((await app.call('POST', '/api/accounts', { name: 'Crypto', kind: 'magic' })).status, 400);
    assert.equal((await app.call('POST', '/api/accounts', { name: 'X', balance: 'lots' })).status, 400);
    const id = (await app.call('GET', '/api/budget')).body.money.accounts[0].id;
    assert.equal((await app.call('POST', '/api/accounts/transfer', { from: id, to: id, amount: 5 })).status, 400);
    assert.equal((await app.call('POST', `/api/accounts/${id}/income`, { amount: 0 })).status, 400);
    assert.equal((await app.call('PUT', '/api/accounts/999/balance', { balance: 5 })).status, 404);
    assert.equal((await app.call('POST', '/api/transactions', { what: 'x', amount: 1, category: 'Food', accountId: 999 })).status, 404);
  });

  test('an account can be renamed and deleted', async () => {
    const id = (await app.call('GET', '/api/budget')).body.money.accounts[2].id;
    assert.equal((await app.call('PATCH', `/api/accounts/${id}`, { name: 'ASB' })).body.money.accounts[2].name, 'ASB');
    assert.equal((await app.call('DELETE', `/api/accounts/${id}`)).body.money.accounts.length, 2);
  });
});

describe('food and health', () => {
  let app;
  before(async () => { app = await start(); });
  after(() => app.close());

  test('food: targets, logging and removing', async () => {
    await app.call('PUT', '/api/food/settings', { targetKcal: 2400, targetProtein: 140 });
    await app.call('POST', '/api/food/log', { food: 'Nasi lemak', kcal: 640, protein: 20, meal: 'Breakfast', remember: true });
    const { body } = await app.call('POST', '/api/food/log', { food: 'Banana', kcal: 100, protein: 1 });
    assert.equal(body.kcal, 740);
    assert.equal(body.left, 1660);
    assert.equal(body.meals.length, 2);
    assert.equal(body.foods[0].name, 'Nasi lemak');   // remembered for quick add
    const after = await app.call('DELETE', `/api/food/log/${body.log[1].id}`);
    assert.equal(after.body.kcal, 640);
  });

  test('food: common meals for quick add, your own saved meal wins, and the day comes with periods and advice', async () => {
    const before = (await app.call('GET', '/api/food')).body;
    assert.ok(before.presets.some((m) => m.name === 'Burger King Whopper'));
    assert.ok(!before.presets.some((m) => /noodle|mee|maggi|kuey|laksa/i.test(m.name)));      // no noodles, as asked
    await app.call('POST', '/api/food/log', { food: 'Burger King Whopper', kcal: 700, protein: 31, meal: 'Lunch', remember: true });
    const after = (await app.call('GET', '/api/food')).body;
    assert.ok(!after.presets.some((m) => m.name === 'Burger King Whopper'));                  // now it is yours, with your numbers
    assert.deepEqual(after.foods.find((f) => f.name === 'Burger King Whopper').kcal, 700);
    assert.deepEqual(Object.keys(after.periods), ['day', 'week', 'month']);
    const advised = (await app.call('PUT', '/api/food/advice', { text: 'Eat more protein.', by: 'Test' })).body;
    assert.deepEqual([advised.advice.text, advised.advice.by], ['Eat more protein.', 'Test']);
    assert.equal((await app.call('PUT', '/api/food/advice', { text: null })).body.advice, null);
  });

  test('food: a remembered food can be forgotten, and what was logged with it stays', async () => {
    const before = (await app.call('GET', '/api/food')).body;
    const id = before.foods.find((f) => f.name === 'Nasi lemak').id;
    const { body } = await app.call('DELETE', `/api/food/items/${id}`);
    assert.equal(body.foods.some((f) => f.name === 'Nasi lemak'), false);
    assert.equal(body.log.some((e) => e.food === 'Nasi lemak'), true);
    assert.equal((await app.call('DELETE', `/api/food/items/${id}`)).status, 404);
  });

  test('food: bad entries are refused', async () => {
    for (const [entry, field] of [[{ food: '', kcal: 100 }, 'food'], [{ food: 'x', kcal: -1 }, 'kcal'], [{ food: 'x', kcal: 100, meal: 'Brunch' }, 'meal'], [{ food: 'x', kcal: 100, protein: 'lots' }, 'protein']]) {
      const { status, body } = await app.call('POST', '/api/food/log', entry);
      assert.equal(status, 400);
      assert.equal(body.error.field, field);
    }
  });

  test('health: targets, a day of data and workouts', async () => {
    await app.call('PUT', '/api/health/settings', { stepTarget: 8000, sleepTargetMinutes: 450, workoutTarget: 4 });
    await app.call('PUT', '/api/health/days/2026-11-20', { steps: 6420, sleepMinutes: 370 });
    const partial = await app.call('PUT', '/api/health/days/2026-11-20', { restingHr: 62 });   // adds to the day, keeps the rest
    assert.equal(partial.body.steps, 6420);
    assert.equal(partial.body.restingHr, 62);
    assert.equal(partial.body.stepsLeft, 1580);
    assert.equal(partial.body.sleepShort, 80);
    const { body } = await app.call('POST', '/api/workouts', { name: 'Push day' });
    assert.equal(body.workouts.done, 1);
    assert.equal((await app.call('DELETE', `/api/workouts/${body.workouts.list[0].id}`)).body.workouts.done, 0);
  });

  test('health: a past day can be filled in and looked at', async () => {
    const saved = await app.call('PUT', '/api/health/days/2026-11-17', { steps: 9100 });
    assert.equal(saved.body.date, '2026-11-17');
    assert.equal(saved.body.steps, 9100);
    const workout = await app.call('POST', '/api/workouts', { name: 'Leg day', date: '2026-11-18' });
    assert.equal(workout.body.date, '2026-11-18');
    assert.equal((await app.call('GET', '/api/health?date=2026-11-10')).body.week[0].date, '2026-11-09');
  });

  test('food: a past day can be logged and looked at', async () => {
    const { body } = await app.call('POST', '/api/food/log', { food: 'Roti canai', kcal: 360, date: '2026-11-19' });
    assert.equal(body.date, '2026-11-19');
    assert.equal(body.log.length, 1);
    assert.equal((await app.call('GET', '/api/food?date=2026-11-19')).body.kcal, 360);
    assert.equal((await app.call('GET', '/api/food?date=2026-11-21')).status, 400);
  });

  test('health: body weight, water, a workout with exercises, and best lifts', async () => {
    await app.call('PUT', '/api/health/settings', { stepTarget: 8000, waterTarget: 2500, weightGoalKg: 70 });
    await app.call('PUT', '/api/health/days/2026-11-02', { weightKg: 73.5 });
    const day = await app.call('PUT', '/api/health/days/2026-11-19', { weightKg: 72.8, waterMl: 2000 });
    assert.equal(day.body.waterLeft, 500);
    assert.deepEqual(day.body.weight.latest, { date: '2026-11-19', kg: 72.8 });
    assert.equal(day.body.weight.change30, -0.7);
    assert.equal(day.body.weight.toGoal, 2.8);

    const made = await app.call('POST', '/api/workouts', {
      name: 'Push day', date: '2026-11-19', kind: 'gym', minutes: 60,
      exercises: [{ name: 'Bench press', sets: 4, reps: 6, weightKg: 60 }, { name: 'Push-ups', sets: 3, reps: 15 }]
    });
    assert.equal(made.status, 200);
    const workout = made.body.workouts.list.find((w) => w.name === 'Push day');
    assert.equal(workout.kind, 'gym');
    assert.equal(workout.exercises.length, 2);
    assert.equal(workout.exercises[1].weightKg, null);       // a body-weight exercise has no kg

    const added = await app.call('POST', `/api/workouts/${workout.id}/exercises`, { name: 'bench press', sets: 2, reps: 3, weightKg: 65 });
    assert.deepEqual(added.body.bests.map((b) => [b.name.toLowerCase(), b.weightKg, b.times]), [['bench press', 65, 2]]);
    const third = added.body.workouts.list.find((w) => w.id === workout.id).exercises[2];
    const removed = await app.call('DELETE', `/api/exercises/${third.id}`);
    assert.equal(removed.body.bests[0].weightKg, 60);
    assert.equal((await app.call('DELETE', `/api/exercises/${third.id}`)).status, 404);

    // Deleting the workout takes its exercises with it.
    await app.call('DELETE', `/api/workouts/${workout.id}`);
    assert.deepEqual((await app.call('GET', '/api/health?date=2026-11-19')).body.bests, []);
  });

  test('health: bad workouts, exercises and weights are refused', async () => {
    const bad = (body) => app.call('POST', '/api/workouts', { name: 'X', ...body });
    assert.equal((await bad({ kind: 'dancing' })).status, 400);
    assert.equal((await bad({ minutes: 0 })).status, 400);
    assert.equal((await bad({ exercises: [{ name: 'Squat', sets: 0, reps: 5 }] })).status, 400);
    assert.equal((await bad({ exercises: 'squats' })).status, 400);
    assert.equal((await app.call('POST', '/api/workouts/9999/exercises', { name: 'Squat', sets: 3, reps: 5 })).status, 404);
    assert.equal((await app.call('PUT', '/api/health/days/2026-11-20', { weightKg: 5 })).status, 400);
    assert.equal((await app.call('PUT', '/api/health/days/2026-11-20', { waterMl: 250.5 })).status, 400);
    assert.equal((await app.call('PUT', '/api/health/settings', { weightGoalKg: 1000 })).status, 400);
  });

  test('health: impossible values and future days are refused', async () => {
    assert.equal((await app.call('PUT', '/api/health/days/2026-11-20', { steps: -1 })).status, 400);
    assert.equal((await app.call('PUT', '/api/health/days/2026-11-20', { steps: 12.5 })).status, 400);
    assert.equal((await app.call('PUT', '/api/health/days/2026-11-20', { restingHr: 5 })).status, 400);
    assert.equal((await app.call('PUT', '/api/health/days/2026-11-21', { steps: 100 })).status, 400);
  });
});

describe('the whole app', () => {
  let app;
  before(async () => { app = await start(); });
  after(() => app.close());

  test('status says what is ready', async () => {
    const { body } = await app.call('GET', '/api/status');
    assert.deepEqual(body, { ok: true, version: '0.1.0', today: TODAY, engine: true, ai: false, empty: true, demo: false });
  });

  test('example data loads once, fills every part, and can be deleted again', async () => {
    assert.equal((await app.call('POST', '/api/demo')).status, 200);
    assert.equal((await app.call('POST', '/api/demo')).status, 409);       // not into an app that has data
    const { body } = await app.call('GET', '/api/overview');
    assert.equal(body.academics.units.length, 4);
    assert.equal(body.academics.terms.length, 2);
    assert.ok(body.budget.spent > 0);
    assert.equal(body.food.kcal, 1500);
    assert.equal(body.health.steps, 6420);
    // The four example units cover each verdict: on course, out of reach, on course, not realistic.
    const verdicts = Object.fromEntries(body.academics.units.map((u) => [u.code, [u.standing.possible, u.standing.realistic]]));
    assert.deepEqual(verdicts, { FIT2004: [true, true], FIT2099: [false, false], FIT2094: [true, true], MAT1830: [true, false] });

    assert.equal((await app.call('DELETE', '/api/data', {})).status, 400);  // needs the exact words
    assert.equal((await app.call('DELETE', '/api/data', { confirm: 'delete everything' })).status, 200);
    assert.equal((await app.call('GET', '/api/status')).body.empty, true);
  });

  test('the life tree holds every year, and the current semester shows how much time has gone', async () => {
    await app.call('POST', '/api/demo');
    await app.call('PUT', '/api/academics/settings', { termDates: { start: '2026-07-27', end: '2026-11-27' } });
    const { status, body } = await app.call('GET', '/api/life');
    assert.equal(status, 200);
    assert.deepEqual(body.children.slice(0, 2).map((y) => y.title), ['2025', '2026']);
    assert.ok(body.children.slice(2).length >= 1 && body.children.slice(2).every((y) => y.value === 'Ahead'));   // the years still to come
    const year = body.children[1];
    assert.deepEqual(year.children.map((a) => a.title), ['Studies', 'Money', 'Food', 'Health']);
    const term = year.children[0].children.find((t) => t.now);
    assert.equal(term.title, 'S2 2026');
    assert.ok(term.time > 0.9 && term.time < 1);
    assert.equal((await app.call('PUT', '/api/academics/settings', { termDates: { start: '2026-12-01', end: '2026-11-01' } })).status, 400);
    assert.equal((await app.call('PUT', '/api/academics/settings', { termDates: { start: 'soon', end: '2026-11-01' } })).status, 400);
    await app.call('DELETE', '/api/data', { confirm: 'delete everything' });
  });

  test('unknown addresses, wrong methods and broken requests get clear errors', async () => {
    assert.equal((await app.call('GET', '/api/nothing')).status, 404);
    assert.equal((await app.call('DELETE', '/api/status')).status, 405);
    assert.equal((await app.call('POST', '/api/units', '{not json')).status, 400);
    assert.equal((await app.call('POST', '/api/units', '[1,2]')).status, 400);
    assert.equal((await app.call('POST', '/api/units', JSON.stringify({ code: 'A1', name: 'x'.repeat(70000) }))).status, 413);
    assert.equal((await app.call('DELETE', '/api/assessments/abc')).status, 404);
  });

  test('a change that is not sent as JSON is refused, so a form on another site cannot make one', async () => {
    const base = (await app.call('GET', '/api/status')).body.ok && app.base;
    for (const type of ['text/plain', 'application/x-www-form-urlencoded', undefined]) {
      const response = await fetch(`${base}/api/demo`, { method: 'POST', headers: type ? { 'Content-Type': type } : {}, body: '{}' });
      assert.equal(response.status, 415, String(type));
    }
    assert.equal((await app.call('GET', '/api/status')).body.empty, true);     // nothing was loaded
  });

  test('the web page is served with strict browser headers', async () => {
    const page = await app.call('GET', '/');
    assert.equal(page.status, 200);
    assert.match(page.body, /test page/);
    assert.match(page.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
  });

  test('files outside the web folder can never be read', async () => {
    for (const address of ['/..%2f..%2fpackage.json', '/%2e%2e/%2e%2e/package.json', '/..%5c..%5cpackage.json']) {
      assert.equal((await app.call('GET', address)).status, 404, address);
    }
  });
});

describe('access token', () => {
  let app;
  before(async () => { app = await start({ token: 'secret-token' }); });
  after(() => app.close());

  test('with a token set, the API needs it and the page does not', async () => {
    assert.equal((await app.call('GET', '/api/status')).status, 401);
    assert.equal((await app.call('GET', '/api/status', undefined, { Authorization: 'Bearer wrong' })).status, 401);
    assert.equal((await app.call('GET', '/api/status', undefined, { Authorization: 'Bearer secret-token' })).status, 200);
    assert.equal((await app.call('GET', '/')).status, 200);
  });
});

describe('wrong token guesses', () => {
  test('after five wrong tokens the address is refused for 15 minutes, even with the right token', async () => {
    let clock = 1_000_000;
    const app = await start({ token: 'secret-token', now: () => clock });
    const wrong = { Authorization: 'Bearer wrong' }, right = { Authorization: 'Bearer secret-token' };
    for (let i = 0; i < 5; i++) assert.equal((await app.call('GET', '/api/status', undefined, wrong)).status, 401);
    const blocked = await app.call('GET', '/api/status', undefined, right);
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.error.code, 'too_many_guesses');
    clock += 15 * 60 * 1000 + 1;                                         // the 15 minutes have passed
    assert.equal((await app.call('GET', '/api/status', undefined, right)).status, 200);
    await app.close();
  });

  test('a right token clears earlier wrong guesses', async () => {
    const app = await start({ token: 'secret-token', now: () => 0 });
    const wrong = { Authorization: 'Bearer wrong' }, right = { Authorization: 'Bearer secret-token' };
    for (let i = 0; i < 4; i++) await app.call('GET', '/api/status', undefined, wrong);
    assert.equal((await app.call('GET', '/api/status', undefined, right)).status, 200);
    for (let i = 0; i < 4; i++) assert.equal((await app.call('GET', '/api/status', undefined, wrong)).status, 401);
    assert.equal((await app.call('GET', '/api/status', undefined, right)).status, 200);
    await app.close();
  });
});

describe('the AI helper', () => {
  test('with no key the feature explains how to turn it on, and the rest of the app works', async () => {
    const app = await start();
    await addFit2004(app.call);
    const { status, body } = await app.call('POST', '/api/advisor/plan');
    assert.equal(status, 503);
    assert.equal(body.error.code, 'ai_not_configured');
    assert.match(body.error.message, /gemini-setup/);
    assert.equal((await app.call('GET', '/api/academics')).status, 200);
    await app.close();
  });

  test('with a key, only a short summary is sent and the key stays in the header', async () => {
    let sent;
    const fetchImpl = async (url, options) => {
      sent = { url, headers: options.headers, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '- FIT2004: revise graphs.' }] } }] }), { status: 200 });
    };
    const app = await start({ geminiKey: 'test-key', fetchImpl });
    await addFit2004(app.call);
    await app.call('PATCH', '/api/units/FIT2004', { target: 70 });
    const { status, body } = await app.call('POST', '/api/advisor/plan');
    assert.equal(status, 200);
    assert.equal(body.plan, '- FIT2004: revise graphs.');
    assert.equal(sent.headers['x-goog-api-key'], 'test-key');
    assert.ok(!sent.url.includes('test-key'));                           // never in the address
    const prompt = sent.body.contents[0].parts[0].text;
    assert.ok(prompt.includes('FIT2004'));
    assert.ok(!prompt.includes('Algorithms and data structures'));       // unit names are not sent
    assert.ok(!JSON.stringify(body).includes('test-key'));               // and the key never reaches the browser
    await app.close();
  });

  test('a screenshot is read into a list for the user to check; nothing is saved', async () => {
    const answer = JSON.stringify([{ name: 'Assignment 1', weight: 20, score: 17, max: 20 }, { name: '', weight: 5 }, { name: 'Exam', weight: 'sixty', score: null, max: null }]);
    const fetchImpl = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: answer }] } }] }), { status: 200 });
    const app = await start({ geminiKey: 'test-key', fetchImpl });
    const { status, body } = await app.call('POST', '/api/import/screenshot', { image: 'A'.repeat(200), mimeType: 'image/png' });
    assert.equal(status, 200);
    assert.deepEqual(body.items, [{ name: 'Assignment 1', weight: 20, score: 17, max: 20 }, { name: 'Exam', weight: null, score: null, max: null }]);
    assert.equal(app.store.listAssessments().length, 0);
    assert.equal((await app.call('POST', '/api/import/screenshot', { image: 'A'.repeat(200), mimeType: 'application/pdf' })).status, 400);
    assert.equal((await app.call('POST', '/api/import/screenshot', { image: 'not base64 !!', mimeType: 'image/png' })).status, 400);
    await app.close();
  });

  test('food: a photo or label is read into a list to check; nothing is saved; bad items are left out', async () => {
    const answer = JSON.stringify([{ food: 'Whopper', kcal: 650.4, protein: 30 }, { food: 'Fries', kcal: 'lots' }, { food: 'Coke', kcal: 210, protein: null }]);
    const fetchImpl = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: answer }] } }] }), { status: 200 });
    const app = await start({ geminiKey: 'test-key', fetchImpl });
    const { status, body } = await app.call('POST', '/api/food/read-picture', { image: 'A'.repeat(200), mimeType: 'image/jpeg' });
    assert.equal(status, 200);
    assert.deepEqual(body.items, [{ food: 'Whopper', kcal: 650, protein: 30 }, { food: 'Coke', kcal: 210, protein: 0 }]);
    assert.equal((await app.call('GET', '/api/food')).body.log.length, 0);
    assert.equal((await app.call('POST', '/api/food/read-picture', { image: 'A'.repeat(200), mimeType: 'text/plain' })).status, 400);
    await app.close();
  });

  test('a used-up limit, an outage and a strange answer each get their own message', async () => {
    const cases = [
      [async () => new Response('{}', { status: 429 }), 429, 'ai_limit'],
      [async () => { throw new Error('offline'); }, 502, 'ai_unreachable'],
      [async () => new Response('{}', { status: 500 }), 502, 'ai_failed'],
      [async () => new Response(JSON.stringify({ candidates: [] }), { status: 200 }), 502, 'ai_empty']
    ];
    for (const [fetchImpl, status, code] of cases) {
      const app = await start({ geminiKey: 'test-key', fetchImpl });
      await addFit2004(app.call);
      const result = await app.call('POST', '/api/advisor/plan');
      assert.equal(result.status, status);
      assert.equal(result.body.error.code, code);
      assert.equal(app.store.listUnits().length, 1);      // a failed AI call never changes the data
      await app.close();
    }
  });
});

describe('when the engine is not built', () => {
  test('grades say so clearly and the other parts keep working', async () => {
    const app = await start({ enginePath: path.join(os.tmpdir(), 'no-such-engine') });
    const grades = await app.call('GET', '/api/academics');
    assert.equal(grades.status, 503);
    assert.equal(grades.body.error.code, 'engine_missing');
    const overview = await app.call('GET', '/api/overview');
    assert.equal(overview.status, 200);
    assert.equal(overview.body.academics, null);
    assert.match(overview.body.academicsError, /engine/);
    assert.equal(overview.body.budget.month, '2026-11');
    await app.close();
  });
});
