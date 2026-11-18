// The Food screen's progress: today, this week and this month as finished text, and the common meals
// grouped for quick add. Pure functions, so they are tested without a browser.

export const FOOD_TABS = [['today', 'Today'], ['progress', 'Progress'], ['eat', 'What to eat'], ['kitchen', 'Kitchen']];
export const isFoodTab = (tab) => FOOD_TABS.some(([id]) => id === tab);

const NAMES = { day: 'Today', week: 'This week', month: 'This month' };

// One card per period. With no targets there is no verdict, only the numbers; days with nothing logged
// are not counted, and the card says how many days were logged.
export function presentFoodPeriods(periods, targets) {
  return ['day', 'week', 'month'].map((key) => {
    const p = periods[key];
    const card = { key, title: NAMES[key], logged: p.logged, length: p.length };
    if (p.logged === 0) return { ...card, big: '-', note: key === 'day' ? 'Nothing logged yet today.' : 'Nothing logged yet.', tone: '' };
    const big = key === 'day' ? `${p.kcal.toLocaleString('en-MY')} kcal` : `${p.averageKcal.toLocaleString('en-MY')} kcal a day`;
    const parts = [];
    if (key !== 'day') parts.push(`${p.logged} of ${p.length} days logged`);
    if (targets.kcal > 0) parts.push(key === 'day' ? (p.daysOnTarget ? 'on target' : 'over target') : `${p.daysOnTarget} on target`);
    if (targets.protein > 0) parts.push(key === 'day' ? `${p.protein} g protein${p.daysProteinMet ? ', target met' : ''}` : `protein met on ${p.daysProteinMet}`);
    else parts.push(`${key === 'day' ? p.protein : p.averageProtein} g protein${key === 'day' ? '' : ' a day'}`);
    const tone = targets.kcal <= 0 ? '' : p.daysOnTarget === p.logged ? 'good' : p.daysOnTarget >= p.logged / 2 ? '' : 'warn';
    return { ...card, big, note: parts.join(' · '), tone };
  });
}

// The common meals, in their groups, in the order the groups first appear.
export function groupPresets(presets) {
  const groups = [];
  for (const meal of presets ?? []) {
    let group = groups.find((g) => g.name === meal.group);
    if (!group) groups.push(group = { name: meal.group, meals: [] });
    group.meals.push(meal);
  }
  return groups;
}
