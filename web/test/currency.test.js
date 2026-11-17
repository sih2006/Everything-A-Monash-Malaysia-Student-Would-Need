import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertAll, convertMoneyText, formatIn, presentRates, rateOf } from '../js/viewmodels/currency.js';

// Made-up rates, "1 MYR = x".
const currency = {
  base: 'MYR',
  currencies: [
    { code: 'USD', name: 'US dollar', perMyr: 0.25, live: 0.25, myrPerUnitByHand: null, from: 'live' },
    { code: 'OMR', name: 'Omani rial', perMyr: 0.1, live: 0.094, myrPerUnitByHand: 10, from: 'hand' },
    { code: 'IDR', name: 'Indonesian rupiah', perMyr: 4000, live: 4000, myrPerUnitByHand: null, from: 'live' },
    { code: 'CAD', name: 'Canadian dollar', perMyr: null, live: null, myrPerUnitByHand: null, from: 'none' }
  ]
};

test('amounts are written with the right decimals for each currency', () => {
  assert.equal(formatIn('MYR', 1234.5), 'RM 1,234.50');
  assert.equal(formatIn('USD', 297.125), 'USD 297.13');
  assert.equal(formatIn('OMR', 114.2304), 'OMR 114.230');
  assert.equal(formatIn('IDR', 4456878.4), 'IDR 4,456,878');
});

test('every ringgit amount on a screen is shown in the chosen currency, and nothing else changes', () => {
  const html = '<b>RM 1,000.00</b> left · RM12 · −RM 5.00 · 64.5 kg · data-tip="Food: RM 40.00" · RM -8.00';
  assert.equal(convertMoneyText(html, 'USD', 0.25), '<b>USD 250.00</b> left · USD 3.00 · −USD 1.25 · 64.5 kg · data-tip="Food: USD 10.00" · -USD 2.00');
  assert.equal(convertMoneyText(html, 'MYR', 1), html);
  assert.equal(convertMoneyText(html, 'CAD', null), html);   // no rate: shown in ringgit, never a wrong number
});

test('rates: ringgit is 1; a missing currency or rate gives null', () => {
  assert.equal(rateOf(currency, 'MYR'), 1);
  assert.equal(rateOf(currency, 'OMR'), 0.1);
  assert.equal(rateOf(currency, 'CAD'), null);
  assert.equal(rateOf(null, 'USD'), null);
});

test('the converter shows an amount in ringgit and every other currency with a rate', () => {
  assert.deepEqual(convertAll(100, 'USD', currency), [
    { code: 'MYR', name: 'Malaysian ringgit', text: 'RM 400.00' },
    { code: 'OMR', name: 'Omani rial', text: 'OMR 40.000' },
    { code: 'IDR', name: 'Indonesian rupiah', text: 'IDR 1,600,000' }
  ]);
  assert.deepEqual(convertAll(-5, 'MYR', currency), []);
  assert.deepEqual(convertAll(5, 'CAD', currency), []);    // no rate to convert from
});

test('the rates card says where each rate came from', () => {
  const rows = presentRates(currency);
  assert.deepEqual(rows[0], { code: 'USD', name: 'US dollar', rate: '1 USD = RM 4.00', from: 'Live', byHand: null, live: '1 USD = RM 4.00', liveHint: '4' });
  assert.deepEqual([rows[1].rate, rows[1].from, rows[1].live], ['1 OMR = RM 10.00', 'Set by hand', '1 OMR = RM 10.64']);
  assert.deepEqual([rows[3].rate, rows[3].from], ['No rate yet', 'Not available']);
  assert.equal(rows[2].rate, '1,000 IDR = RM 0.25');            // worth less than a sen: shown per 1,000
  assert.equal(rows[2].liveHint, '0.00025');                     // but the box still asks for 1 IDR
});
