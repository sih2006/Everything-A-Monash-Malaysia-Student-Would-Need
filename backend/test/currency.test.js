import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';

import { createApp } from '../src/api.js';
import { openDatabase } from '../src/db.js';
import { createRates } from '../src/rates.js';
import { createStore } from '../src/store.js';

const RATES = { USD: 0.25, OMR: 0.094, CZK: 5.4, CAD: 0.35, IDR: 4450 };
const answer = (rates = RATES) => ({ ok: true, status: 200, json: async () => ({ result: 'success', base_code: 'MYR', time_last_update_unix: Date.UTC(2026, 10, 18) / 1000, rates: { ...rates, EUR: 0.21 } }) });

// A fresh app on a free port, with a fake rate service: tests never touch the network. `day` is the app's "today".
async function makeApp(t, fetchImpl) {
  const db = openDatabase(':memory:');
  const calls = [];
  let day = '2026-11-18';
  const app = createApp({
    db, store: createStore(db), engine: null, gemini: { configured: false }, webDir: '.',
    rates: createRates({ fetchImpl: async (url, options) => { calls.push(url); return fetchImpl(url, options); } }),
    today: () => day
  });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, body) => {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) });
    return { status: response.status, body: await response.json() };
  };
  return { call, calls, setDay: (d) => { day = d; } };
}

test('currency: live rates are fetched once a day, and only the base code is sent', async (t) => {
  const { call, calls, setDay } = await makeApp(t, async () => answer());
  const first = (await call('GET', '/api/currency')).body;
  assert.deepEqual(first.currencies.map((c) => c.code), ['USD', 'OMR', 'CZK', 'CAD', 'IDR']);
  assert.deepEqual(first.currencies.find((c) => c.code === 'USD'), { code: 'USD', name: 'US dollar', live: 0.25, myrPerUnitByHand: null, perMyr: 0.25, from: 'live' });
  assert.equal(first.updated, '2026-11-18');
  await call('GET', '/api/currency');
  assert.equal(calls.length, 1);                                    // the same day: the saved rates are used
  assert.equal(calls[0], 'https://open.er-api.com/v6/latest/MYR');  // nothing but the base currency in the address
  setDay('2026-11-19');
  await call('GET', '/api/currency');
  assert.equal(calls.length, 2);                                    // a new day: fetched again
  await call('POST', '/api/currency/refresh');
  assert.equal(calls.length, 3);                                    // asked for: fetched again
});

test('currency: when the service fails, the last saved rates stay and the answer says why', async (t) => {
  let fail = false;
  const { call, setDay } = await makeApp(t, async () => { if (fail) throw new Error('offline'); return answer(); });
  await call('GET', '/api/currency');
  fail = true;
  setDay('2026-11-19');
  const after = (await call('GET', '/api/currency')).body;
  assert.match(after.error, /could not be reached/);
  assert.equal(after.currencies.find((c) => c.code === 'OMR').perMyr, 0.094);
  assert.equal(after.fetchedOn, '2026-11-18');
});

test('currency: a strange answer is refused, not saved', async (t) => {
  const { call } = await makeApp(t, async () => answer({ ...RATES, CAD: 0 }));
  const state = (await call('GET', '/api/currency')).body;
  assert.match(state.error, /no rate for CAD/);
  assert.equal(state.currencies.every((c) => c.from === 'none'), true);
});

test('currency: a rate set by hand wins, and removing it brings the live rate back', async (t) => {
  const { call } = await makeApp(t, async () => answer());
  const set = (await call('PUT', '/api/currency/manual', { code: 'usd', myrPerUnit: 5 })).body;
  assert.deepEqual(set.currencies.find((c) => c.code === 'USD'), { code: 'USD', name: 'US dollar', live: 0.25, myrPerUnitByHand: 5, perMyr: 0.2, from: 'hand' });
  assert.equal((await call('PUT', '/api/currency/manual', { code: 'EUR', myrPerUnit: 5 })).status, 400);
  assert.equal((await call('PUT', '/api/currency/manual', { code: 'USD', myrPerUnit: 0 })).status, 400);
  const back = (await call('PUT', '/api/currency/manual', { code: 'USD', myrPerUnit: null })).body;
  assert.equal(back.currencies.find((c) => c.code === 'USD').from, 'live');
});
