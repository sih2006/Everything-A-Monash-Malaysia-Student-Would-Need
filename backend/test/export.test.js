// Tests for exporting all data to one file and loading it back.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
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
if (!existsSync(enginePath)) throw new Error(`The grade engine is not built at ${enginePath}. Build the core first.`);

async function start() {
  const db = openDatabase(':memory:');
  const app = createApp({
    db, store: createStore(db), engine: createEngine(enginePath), gemini: createGemini({ apiKey: '' }),
    webDir: mkdtempSync(path.join(os.tmpdir(), 'web-')), today: () => '2026-11-20'
  });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, address, body) => {
    const response = await fetch(base + address, {
      method, headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {})
    });
    return { status: response.status, body: await response.json() };
  };
  return { call, close: () => new Promise((resolve) => server.close(resolve)) };
}

describe('export and import', () => {
  let app, exported;
  before(async () => {
    app = await start();
    await app.call('POST', '/api/demo');
    exported = (await app.call('GET', '/api/export')).body;
  });
  after(() => app.close());

  test('the export names its format and holds every part', () => {
    assert.equal(exported.format, 'student-companion-export');
    assert.equal(exported.version, 1);
    assert.equal(exported.exportedOn, '2026-11-20');
    assert.equal(exported.units.length, 4);
    assert.equal(exported.assessments.length, 15);
    assert.equal(exported.results.length, 8);
    assert.equal(exported.categories.length, 5);
    assert.ok(exported.transactions.length > 0);
    assert.equal(exported.settings['academics.goal'].measure, 'cgpa');
    assert.ok(!('id' in exported.units[0]));               // database ids are not part of the file
    assert.equal(exported.accounts.length, 3);
    assert.ok(exported.accountMoves.some((m) => m.transaction !== null));   // spending paid from an account
  });

  test('a file cannot be loaded over existing data', async () => {
    const { status, body } = await app.call('POST', '/api/import', exported);
    assert.equal(status, 409);
    assert.equal(body.error.code, 'not_empty');
  });

  test('export, delete everything, import: the app is the same as before', async () => {
    const beforeReport = (await app.call('GET', '/api/overview')).body;
    await app.call('DELETE', '/api/data', { confirm: 'delete everything' });
    assert.equal((await app.call('GET', '/api/status')).body.empty, true);

    const { status } = await app.call('POST', '/api/import', exported);
    assert.equal(status, 200);
    const again = (await app.call('GET', '/api/export')).body;
    // Same file again, apart from the category ids, which are given new values.
    // Categories and accounts get new ids, so compare them by name instead.
    const withoutIds = (file) => {
      const accountName = new Map(file.accounts.map((a) => [a.id, a.name]));
      return {
        ...file,
        categories: file.categories.map(({ name, limit }) => ({ name, limit })),
        transactions: file.transactions.map(({ categoryId, ...rest }) => rest),
        accounts: file.accounts.map(({ name, kind }) => ({ name, kind })),
        accountMoves: file.accountMoves.map(({ accountId, ...rest }) => ({ ...rest, account: accountName.get(accountId) }))
      };
    };
    assert.deepEqual(withoutIds(again), withoutIds(exported));

    const afterReport = (await app.call('GET', '/api/overview')).body;
    assert.deepEqual(afterReport.academics.finished, beforeReport.academics.finished);
    assert.equal(afterReport.budget.spent, beforeReport.budget.spent);
    assert.deepEqual(afterReport.budget.categories.map((c) => [c.name, c.spent]), beforeReport.budget.categories.map((c) => [c.name, c.spent]));
  });
});

describe('a damaged or edited file', () => {
  let app, good;
  before(async () => {
    app = await start();
    await app.call('POST', '/api/demo');
    good = (await app.call('GET', '/api/export')).body;
    await app.call('DELETE', '/api/data', { confirm: 'delete everything' });
  });
  after(() => app.close());

  const broken = (change) => {
    const copy = structuredClone(good);
    change(copy);
    return copy;
  };

  const cases = [
    ['not a file from this app', (f) => { f.format = 'something else'; }],
    ['a newer version', (f) => { f.version = 2; }],
    ['a part that is not a list', (f) => { f.units = 'FIT2004'; }],
    ['the same unit twice', (f) => { f.units.push({ ...f.units[0] }); }],
    ['an assessment with no unit', (f) => { f.assessments[0].unitCode = 'NOPE1000'; }],
    ['a mark above 100', (f) => { f.results[0].mark = 140; }],
    ['a made-up grade', (f) => { f.results[0].grade = 'A+'; }],
    ['spending with no category', (f) => { f.transactions[0].categoryId = 999; }],
    ['a date that does not exist', (f) => { f.foodLog[0].date = '2026-02-30'; }],
    ['a meal that does not exist', (f) => { f.foodLog[0].meal = 'Brunch'; }],
    ['text with a line break in a name', (f) => { f.units[0].name = 'two\nlines'; }],
    ['steps that are not whole', (f) => { f.healthDays[0].steps = 12.5; }],
    ['an account entry with no account', (f) => { f.accountMoves[0].accountId = 999; }],
    ['an account of an unknown kind', (f) => { f.accounts[0].kind = 'magic'; }],
    ['two account entries for the same spending', (f) => { const m = f.accountMoves.find((x) => x.transaction !== null); f.accountMoves.push({ ...m }); }]
  ];
  for (const [name, change] of cases) {
    test(`is refused: ${name}`, async () => {
      const { status } = await app.call('POST', '/api/import', broken(change));
      assert.equal(status, 400);
      assert.equal((await app.call('GET', '/api/status')).body.empty, true);     // nothing was kept
    });
  }

  test('weights above 100% pass every row check but are refused by the grade engine, and nothing is kept', async () => {
    const tooHeavy = broken((f) => { f.assessments.push({ unitCode: 'FIT2004', name: 'Extra', weight: 50, score: null, max: 100, hurdle: null }); });
    const { status, body } = await app.call('POST', '/api/import', tooHeavy);
    assert.equal(status, 400);
    assert.match(body.error.message, /100%/);
    assert.equal((await app.call('GET', '/api/status')).body.empty, true);
    assert.equal((await app.call('GET', '/api/export')).body.units.length, 0);
  });

  test('advice, the kitchen, food preferences and goal answers, and rates typed by hand survive a download and a load', async () => {
    const fresh = await start();
    await fresh.call('POST', '/api/demo');
    await fresh.call('PUT', '/api/budget/advice', { text: 'Cook more.\n- Fewer deliveries.', by: 'Test' });
    await fresh.call('PUT', '/api/food/advice', { text: 'More protein.', by: 'Test' });
    await fresh.call('PUT', '/api/food/kitchen', { equipment: ['Air fryer', 'Rice cooker'], pantry: ['Rice', 'Eggs'] });
    await fresh.call('PUT', '/api/currency/manual', { code: 'USD', myrPerUnit: 4.2 });
    await fresh.call('PUT', '/api/food/preferences', { avoid: ['cucumber'], priority: 'time' });
    await fresh.call('PUT', '/api/health/days/2026-11-19', { weightKg: 90 });
    const health = (await fresh.call('GET', '/api/health')).body;
    await fresh.call('PUT', '/api/health/settings', { stepTarget: health.stepTarget, sleepTargetMinutes: health.sleepTargetMinutes, workoutTarget: health.workoutTarget, heightCm: 180, weightGoalKg: 80 });
    assert.equal((await fresh.call('POST', '/api/food/goal-targets', { age: 20, sex: 'male', activity: 'light', weeks: 10 })).status, 200);
    const file = (await fresh.call('GET', '/api/export')).body;
    await fresh.call('DELETE', '/api/data', { confirm: 'delete everything' });
    assert.equal((await fresh.call('POST', '/api/import', file)).status, 200);
    const back = (await fresh.call('GET', '/api/export')).body.settings;
    for (const key of ['budget.advice', 'food.advice', 'food.kitchen', 'food.preferences', 'food.profile', 'currency.manual']) assert.deepEqual(back[key], file.settings[key], key);
    await fresh.close();
  });

  test('the good file still loads after all of that', async () => {
    assert.equal((await app.call('POST', '/api/import', good)).status, 200);
  });
});
