import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupPresets, isFoodTab, presentFoodPeriods } from '../js/viewmodels/food.js';

const period = (over) => ({ logged: 0, length: 1, kcal: 0, protein: 0, averageKcal: 0, averageProtein: 0, daysOnTarget: null, daysProteinMet: null, ...over });

test('progress with targets: today, the week and the month each say how it went', () => {
  const periods = {
    day: period({ logged: 1, kcal: 1850, protein: 120, daysOnTarget: 1, daysProteinMet: 1 }),
    week: period({ length: 7, logged: 3, averageKcal: 2100, averageProtein: 95, daysOnTarget: 2, daysProteinMet: 1 }),
    month: period({ length: 30, logged: 10, averageKcal: 2400, averageProtein: 80, daysOnTarget: 3, daysProteinMet: 2 })
  };
  const [day, week, month] = presentFoodPeriods(periods, { kcal: 2000, protein: 110 });
  assert.deepEqual([day.big, day.note, day.tone], ['1,850 kcal', 'on target · 120 g protein, target met', 'good']);
  assert.deepEqual([week.big, week.note, week.tone], ['2,100 kcal a day', '3 of 7 days logged · 2 on target · protein met on 1', '']);
  assert.equal(month.tone, 'warn');                       // on target on fewer than half the days logged
});

test('progress with no targets: numbers only; empty periods say so', () => {
  const periods = { day: period({}), week: period({ length: 7, logged: 2, averageKcal: 1900, averageProtein: 70 }), month: period({ length: 30 }) };
  const [day, week, month] = presentFoodPeriods(periods, { kcal: 0, protein: 0 });
  assert.deepEqual([day.big, day.note], ['-', 'Nothing logged yet today.']);
  assert.deepEqual([week.note, week.tone], ['2 of 7 days logged · 70 g protein a day', '']);
  assert.equal(month.note, 'Nothing logged yet.');
});

test('common meals keep their groups, in order', () => {
  const groups = groupPresets([{ name: 'Whopper', group: 'Burger King' }, { name: 'Nasi lemak', group: 'Malaysian' }, { name: 'Fries', group: 'Burger King' }]);
  assert.deepEqual(groups.map((g) => [g.name, g.meals.map((m) => m.name)]), [['Burger King', ['Whopper', 'Fries']], ['Malaysian', ['Nasi lemak']]]);
  assert.deepEqual(groupPresets(undefined), []);
  assert.ok(isFoodTab('progress') && !isFoodTab('snacks'));
});
