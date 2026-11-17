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

// "2026-10" plus -2 months is "2026-08".
export function addMonths(month, count) {
  const date = toUtc(month + '-01');
  date.setUTCMonth(date.getUTCMonth() + count);
  return toDay(date).slice(0, 7);
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
    return { id: c.id, name: c.name, limit: c.limit, essential: c.essential === true, spent, left: round2(c.limit - spent), over: c.limit > 0 && spent > c.limit, percent: c.limit > 0 ? spent / c.limit * 100 : 0 };
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
    recent: inMonth
  };
}

// ---------- money accounts ----------

export const ACCOUNT_KINDS = ['bank', 'ewallet', 'investment', 'cash'];

// Works out each account's balance from its moves, which must be in the order they were entered.
// A 'set' move is the user typing the real balance: it replaces whatever was worked out before it.
// Then each 'in' adds and each 'out' takes away.
// Spending that could be cut: everything outside the essential categories, over the given months.
// Each place is listed with its total, how often you went, the average, and what it comes to a month.
const PLACES_SHOWN = 6;
export function reducibleSpending({ categories, transactions, months }) {
  const essential = new Set(categories.filter((c) => c.essential).map((c) => c.id));
  const name = new Map(categories.map((c) => [c.id, c.name]));
  const cuttable = transactions.filter((t) => !essential.has(t.categoryId));
  const placesIn = (category) => {
    const places = [...byPlace.values()].filter((p) => p.category === category).sort((a, b) => b.total - a.total);
    const shown = places.slice(0, PLACES_SHOWN), rest = places.slice(PLACES_SHOWN);
    if (rest.length) shown.push({ what: `${rest.length} other ${rest.length === 1 ? 'place' : 'places'}`, total: round2(rest.reduce((s, p) => s + p.total, 0)), count: rest.reduce((s, p) => s + p.count, 0), rest: true });
    return shown.map((p) => ({ what: p.what, total: p.total, count: p.count, perMonth: round2(p.total / months), ...(p.rest ? { rest: true } : {}) }));
  };
  const total = round2(cuttable.reduce((sum, t) => sum + t.amount, 0));
  const byCategory = new Map(), byPlace = new Map();
  for (const t of cuttable) {
    const c = name.get(t.categoryId) ?? 'Other';
    byCategory.set(c, round2((byCategory.get(c) ?? 0) + t.amount));
    const key = `${t.what}\u0000${c}`;
    const p = byPlace.get(key) ?? { what: t.what, category: c, total: 0, count: 0 };
    p.total = round2(p.total + t.amount);
    p.count += 1;
    byPlace.set(key, p);
  }
  return {
    months, total, perMonth: months ? round2(total / months) : total,
    // Each category also lists its places, biggest first. After the first `PLACES_SHOWN`, the rest are added up as one.
    byCategory: [...byCategory].map(([category, amount]) => ({ category, amount, perMonth: round2(amount / months), places: placesIn(category) }))
      .sort((a, b) => b.amount - a.amount),
    top: [...byPlace.values()].sort((a, b) => b.total - a.total).slice(0, 8)
      .map((p) => ({ ...p, average: round2(p.total / p.count), perMonth: round2(p.total / months) })),
    essential: categories.filter((c) => c.essential).map((c) => c.name)
  };
}

// Money that came in during a month: every "in" move except moves between your own accounts.
// Grouped by where it came from (the note), biggest first. Net is what is left after the month's spending.
export function incomeSummary(moves, month, spent) {
  const { from, to } = monthRange(month);
  const inMonth = moves.filter((m) => m.kind === 'in' && !m.transfer && m.date >= from && m.date <= to);
  const bySource = new Map();
  for (const m of inMonth) {
    const source = m.note || 'Money in';
    bySource.set(source, round2((bySource.get(source) ?? 0) + m.amount));
  }
  const total = round2(inMonth.reduce((sum, m) => sum + m.amount, 0));
  return {
    total, net: round2(total - spent),
    sources: [...bySource].map(([source, amount]) => ({ source, amount })).sort((a, b) => b.amount - a.amount)
  };
}

export function accountSummary(accounts, moves) {
  const byAccount = new Map(accounts.map((a) => [a.id, { ...a, balance: 0, lastSet: null, recent: [] }]));
  for (const m of moves) {
    const a = byAccount.get(m.accountId);
    if (!a) continue;
    if (m.kind === 'set') {
      a.balance = m.amount;
      a.lastSet = m.date;
    } else {
      a.balance += m.kind === 'in' ? m.amount : -m.amount;
    }
    a.recent.unshift({ id: m.id, kind: m.kind, amount: m.amount, date: m.date, note: m.note, fromSpending: m.transactionId !== null && m.transactionId !== undefined });
  }
  const list = [...byAccount.values()].map((a) => ({ ...a, balance: round2(a.balance), recent: a.recent.slice(0, 6) }));
  const sum = (items) => round2(items.reduce((total, a) => total + a.balance, 0));
  return {
    accounts: list,
    total: sum(list),
    // Money you can spend today, apart from what is invested.
    spendable: sum(list.filter((a) => a.kind !== 'investment')),
    invested: sum(list.filter((a) => a.kind === 'investment'))
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
// `date` is the day being looked at. `today` is the real today: days after it have not happened yet.
export const WORKOUT_KINDS = ['gym', 'run', 'walk', 'cycle', 'swim', 'sport', 'other'];

const average = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);

// Body weight over time. `weights` is every day with a weight, oldest first, up to the day looked at.
// The change is from the first weight in the 30 days before the latest one. The goal is the user's own.
export function weightTrend(weights, goalKg = null, heightCm = null) {
  const latest = weights.at(-1) ?? null;
  if (!latest) return { latest: null, change30: null, goalKg, toGoal: null, points: [], heightCm, bmi: null };
  const start = weights.find((w) => w.day >= addDays(latest.day, -30));
  const round1 = (x) => Math.round(x * 10) / 10;
  return {
    latest: { date: latest.day, kg: latest.weightKg },
    change30: start && start.day !== latest.day ? round1(latest.weightKg - start.weightKg) : null,
    goalKg,
    toGoal: goalKg === null ? null : round1(latest.weightKg - goalKg),   // above the goal when positive
    heightCm,
    bmi: heightCm ? round1(latest.weightKg / (heightCm / 100) ** 2) : null,
    points: weights.slice(-30).map((w) => ({ date: w.day, kg: w.weightKg }))
  };
}

export function healthSummary({ date, today = date, targets, days, workouts, weights = [], bests = [] }) {
  const { from } = weekRange(date);
  const byDay = new Map(days.map((d) => [d.day, d]));

  const week = WEEKDAYS.map((name, index) => {
    const day = addDays(from, index);
    const stored = byDay.get(day) ?? {};
    return {
      name, date: day, today: day === date, future: day > today,
      steps: stored.steps ?? null, sleepMinutes: stored.sleepMinutes ?? null, restingHr: stored.restingHr ?? null,
      weightKg: stored.weightKg ?? null, waterMl: stored.waterMl ?? null
    };
  });

  const chosen = week.find((d) => d.today);   // the day being looked at
  const heartRates = week.filter((d) => d.restingHr !== null).map((d) => d.restingHr);
  const weekWorkouts = workouts.filter((w) => w.date >= from && w.date <= addDays(from, 6));
  const stepDays = week.filter((d) => !d.future && d.steps !== null);
  const sleeps = week.filter((d) => !d.future && d.sleepMinutes !== null).map((d) => d.sleepMinutes);
  const waterTarget = targets.waterMl ?? 0;
  const kinds = WORKOUT_KINDS.map((kind) => {
    const list = weekWorkouts.filter((w) => (w.kind ?? 'other') === kind);
    return { kind, count: list.length, minutes: list.reduce((n, w) => n + (w.minutes ?? 0), 0) };
  }).filter((k) => k.count > 0);

  return {
    date, stepTarget: targets.steps, sleepTargetMinutes: targets.sleepMinutes, workoutTarget: targets.workouts,
    week,
    steps: chosen.steps, sleepMinutes: chosen.sleepMinutes, restingHr: chosen.restingHr,
    stepsOk: chosen.steps !== null && targets.steps > 0 && chosen.steps >= targets.steps,
    stepsLeft: chosen.steps === null ? null : Math.max(0, targets.steps - chosen.steps),
    sleepShort: chosen.sleepMinutes === null ? null : Math.max(0, targets.sleepMinutes - chosen.sleepMinutes),
    restingHrWeek: heartRates.length ? Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length) : null,
    daysOnTarget: stepDays.filter((d) => targets.steps > 0 && d.steps >= targets.steps).length,
    daysLogged: stepDays.length,
    workouts: {
      done: weekWorkouts.length, target: targets.workouts, list: weekWorkouts,
      minutes: weekWorkouts.reduce((n, w) => n + (w.minutes ?? 0), 0), kinds
    },
    stepsAverage: stepDays.length ? Math.round(average(stepDays.map((d) => d.steps))) : null,
    sleepAverage: sleeps.length ? Math.round(average(sleeps)) : null,
    waterMl: chosen.waterMl, waterTarget,
    waterLeft: chosen.waterMl === null || !waterTarget ? null : Math.max(0, waterTarget - chosen.waterMl),
    weightKg: chosen.weightKg,
    weight: weightTrend(weights, targets.weightGoalKg ?? null, targets.heightCm ?? null),
    bests
  };
}
