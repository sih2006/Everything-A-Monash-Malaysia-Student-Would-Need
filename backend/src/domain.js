// The rules for budget, food and health.
//
// Every function here is pure: it takes plain data in and gives plain data
// back. It does not read the clock, the database or the network. That is why
// "today" is always passed in, and why these rules can be tested in
// milliseconds.
//
// (The grade rules are not here. They live in the C++ core.)

const round2 = (n) => Math.round(n * 100) / 100;

// ---------- dates ----------
// A day is always the text "YYYY-MM-DD". Text days sort and compare correctly.

// Today's date in Malaysia, whatever the computer's own time zone is.
export function todayIn(timeZone = 'Asia/Kuala_Lumpur', now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

const toUtc = (day) => new Date(day + 'T00:00:00Z');
const toDay = (date) => date.toISOString().slice(0, 10);

export function addDays(day, count) {
  const date = toUtc(day);
  date.setUTCDate(date.getUTCDate() + count);
  return toDay(date);
}

export const isDay = (text) => typeof text === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(toUtc(text).getTime()) && toDay(toUtc(text)) === text;
export const isMonth = (text) => typeof text === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(text);

// The first and last day of a month given as "YYYY-MM".
export function monthRange(month) {
  const [year, m] = month.split('-').map(Number);
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(days).padStart(2, '0')}`, days };
}

// The Monday-to-Sunday week that contains `day`.
export function weekRange(day) {
  const weekday = (toUtc(day).getUTCDay() + 6) % 7;   // Monday = 0
  const from = addDays(day, -weekday);
  return { from, to: addDays(from, 6) };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ---------- budget ----------

// `categories` have {id, name, limit}; `transactions` have {id, what, amount, date, categoryId, category}.
// `limit` is the limit for the whole month. When it is not set, the category limits are added up.
export function budgetSummary({ month, today, limit, categories, transactions }) {
  const { from, to, days } = monthRange(month);
  const inMonth = transactions.filter((t) => t.date >= from && t.date <= to);

  // How far through the month we are: 0 before it starts, all of it once it has ended.
  const day = today < from ? 0 : today > to ? days : Number(today.slice(8, 10));
  const daysLeft = days - day;

  const perCategory = categories.map((c) => {
    const spent = round2(inMonth.filter((t) => t.categoryId === c.id).reduce((sum, t) => sum + t.amount, 0));
    return { id: c.id, name: c.name, limit: c.limit, spent, left: round2(c.limit - spent), over: c.limit > 0 && spent > c.limit, percent: c.limit > 0 ? spent / c.limit * 100 : 0 };
  });

  const total = limit ?? round2(categories.reduce((sum, c) => sum + c.limit, 0));
  const spent = round2(inMonth.reduce((sum, t) => sum + t.amount, 0));
  const left = round2(total - spent);
  const spentPercent = total > 0 ? spent / total * 100 : 0;
  const monthPercent = day / days * 100;
  const over = total > 0 && spent > total;
  const ahead = !over && total > 0 && spentPercent > monthPercent + 5;   // more than 5 points ahead of the calendar

  // Spending week by week: days 1-7, 8-14, 15-21, 22-28, and whatever is left.
  const weeks = [];
  for (let start = 1; start <= days; start += 7) {
    const end = Math.min(start + 6, days);
    const first = `${month}-${String(start).padStart(2, '0')}`, last = `${month}-${String(end).padStart(2, '0')}`;
    weeks.push({
      name: `Week ${weeks.length + 1}`,
      days: `Days ${start} to ${end}`,
      spent: round2(inMonth.filter((t) => t.date >= first && t.date <= last).reduce((sum, t) => sum + t.amount, 0)),
      state: day >= end ? 'done' : day >= start ? 'now' : 'ahead'
    });
  }

  const [year, m] = month.split('-').map(Number);
  return {
    month, monthName: `${MONTHS[m - 1]} ${year}`, day, days, daysLeft,
    limit: total, hasLimit: total > 0, spent, left, spentPercent, monthPercent, over, ahead,
    perDay: daysLeft > 0 ? round2(Math.max(0, left) / daysLeft) : 0,
    perDaySoFar: day > 0 ? round2(spent / day) : 0,
    verdict: total <= 0 ? 'No limit set' : over ? 'Over your limit' : ahead ? 'Ahead of pace' : 'On pace',
    tone: over || ahead ? 'warn' : 'good',
    mood: total <= 0 ? 'waiting' : over ? 'panicking' : ahead ? 'stressed' : 'relaxed',
    categories: perCategory, weeks,
    recent: inMonth.slice(0, 8)
  };
}

// ---------- food ----------

// `log` entries have {id, meal, food, kcal, protein}. `targets` has {kcal, protein}; either may be 0 for "not set".
export function foodSummary({ date, targets, log, foods }) {
  const kcal = Math.round(log.reduce((sum, e) => sum + e.kcal, 0));
  const protein = Math.round(log.reduce((sum, e) => sum + e.protein, 0));
  const over = targets.kcal > 0 && kcal > targets.kcal;
  const proteinLeft = Math.max(0, targets.protein - protein);

  // Group the log into meals, in the order each meal first appears.
  const meals = [];
  for (const entry of log) {
    let meal = meals.find((x) => x.meal === entry.meal);
    if (!meal) meals.push(meal = { meal: entry.meal, kcal: 0, protein: 0, foods: [] });
    meal.kcal += entry.kcal;
    meal.protein += entry.protein;
    meal.foods.push(entry.food);
  }

  return {
    date, targetKcal: targets.kcal, targetProtein: targets.protein, hasTargets: targets.kcal > 0,
    kcal, protein, over,
    left: targets.kcal - kcal, proteinLeft,
    percent: targets.kcal > 0 ? kcal / targets.kcal * 100 : 0,
    proteinPercent: targets.protein > 0 ? protein / targets.protein * 100 : 0,
    verdict: targets.kcal <= 0 ? 'No target set' : over ? 'Over target' : 'On target',
    tone: over ? 'warn' : 'good',
    mood: targets.kcal <= 0 ? 'waiting' : over ? 'concerned' : targets.protein > 0 && proteinLeft === 0 ? 'proud' : targets.protein > 0 ? 'wants more protein' : 'pleased',
    log, meals, foods
  };
}

// ---------- health ----------

// `days` have {day, steps, sleepMinutes, restingHr}; `workouts` have {id, date, name}.
// `targets` has {steps, sleepMinutes, workouts}.
export function healthSummary({ date, targets, days, workouts }) {
  const { from } = weekRange(date);
  const byDay = new Map(days.map((d) => [d.day, d]));

  const week = WEEKDAYS.map((name, index) => {
    const day = addDays(from, index);
    const stored = byDay.get(day) ?? {};
    return {
      name, date: day, today: day === date, future: day > date,
      steps: stored.steps ?? null, sleepMinutes: stored.sleepMinutes ?? null, restingHr: stored.restingHr ?? null
    };
  });

  const today = week.find((d) => d.today);
  const heartRates = week.filter((d) => d.restingHr !== null).map((d) => d.restingHr);
  const weekWorkouts = workouts.filter((w) => w.date >= from && w.date <= addDays(from, 6));
  const stepDays = week.filter((d) => !d.future && d.steps !== null);

  return {
    date, stepTarget: targets.steps, sleepTargetMinutes: targets.sleepMinutes, workoutTarget: targets.workouts,
    week,
    steps: today.steps, sleepMinutes: today.sleepMinutes, restingHr: today.restingHr,
    stepsOk: today.steps !== null && targets.steps > 0 && today.steps >= targets.steps,
    stepsLeft: today.steps === null ? null : Math.max(0, targets.steps - today.steps),
    sleepShort: today.sleepMinutes === null ? null : Math.max(0, targets.sleepMinutes - today.sleepMinutes),
    restingHrWeek: heartRates.length ? Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length) : null,
    daysOnTarget: stepDays.filter((d) => targets.steps > 0 && d.steps >= targets.steps).length,
    daysLogged: stepDays.length,
    workouts: { done: weekWorkouts.length, target: targets.workouts, list: weekWorkouts }
  };
}
