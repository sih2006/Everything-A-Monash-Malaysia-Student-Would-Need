// The API: every address the web app can call, and what each one does.
//
// Each handler is short on purpose. It checks the input, asks the store to
// read or write, asks the domain (or the C++ engine) to work things out, and
// returns plain data. The full list of addresses is in docs/02-design/backend-schema.md.

import { timingSafeEqual } from 'node:crypto';

import { inTransaction } from './db.js';
import { ACCOUNT_KINDS, WORKOUT_KINDS, accountSummary, addDays, incomeSummary, monthlySpending, spendingSpans, budgetSummary, foodSummary, healthSummary, isDay, isMonth, monthRange, todayIn, weekRange } from './domain.js';
import { EngineMissing } from './engine.js';
import { HttpError, check, createRouter, readJson, sendJson, sendStatic } from './http.js';
import { lifeTree } from './life.js';
import { loadDemo } from './seed.js';

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const GRADES = ['HD', 'D', 'C', 'P', 'NP', 'N', 'NH', 'WN'];
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const SMALL = 64 * 1024;            // size limit for normal requests
const PICTURE = 8 * 1024 * 1024;    // size limit for a screenshot, or a file of exported data
const EXPORT_FORMAT = 'student-companion-export';

export function createApp({ db, store, engine, gemini, webDir, today = () => todayIn(), token = '', log = () => {}, now = () => Date.now(), demo = false }) {
  const router = createRouter();
  const route = (method, pattern, handler, limit = SMALL) => router.add(method, pattern, { handler, limit });

  // ================= academics =================

  const academicsState = () => ({
    currentTerm: store.getSetting('academics.currentTerm', ''),
    margin: store.getSetting('academics.margin', 10),
    goal: store.getSetting('academics.goal', null),
    units: store.listUnits(),
    assessments: store.listAssessments(),
    results: store.listResults()
  });

  // Asks the C++ engine for the full report on the stored data.
  // If the engine finds a broken rule (for example weights above 100%), that becomes a 400 error.
  function academicsReport(questions = []) {
    const state = academicsState();
    let report;
    try {
      report = engine.report(state, questions);
    } catch (error) {
      if (error instanceof EngineMissing) throw new HttpError(503, 'engine_missing', error.message);
      throw error;
    }
    if (!report.ok) {
      const message = report.errors[0].replace(/^line \d+: /, '');
      throw new HttpError(400, 'invalid', message.charAt(0).toUpperCase() + message.slice(1));
    }
    // The engine only knows positions; give the screens the database ids they need for edits.
    for (const term of report.terms) for (const unit of term.units) unit.id = state.results[unit.index].id;
    for (const unit of report.units) for (const a of unit.assessments) a.id = Number(a.id);
    report.settings = { currentTerm: state.currentTerm, margin: state.margin, goal: state.goal, termDates: store.getSetting('academics.termDates', null) };
    return report;
  }

  // Makes a change, then lets the engine judge the result. If the engine
  // rejects it, the change is rolled back, so invalid data is never stored.
  const changeAcademics = (work) => inTransaction(db, () => {
    work();
    return academicsReport();
  });

  const unitCode = (value) => {
    const code = check.text(value, 'code', { max: 12 }).toUpperCase();
    if (!/^[A-Z0-9-]+$/.test(code)) throw new HttpError(400, 'invalid', 'A unit code uses only letters and numbers, like FIT2004.', 'code');
    return code;
  };
  const mustFindUnit = (code) => {
    if (!store.getUnit(code)) throw new HttpError(404, 'not_found', `There is no unit with the code ${code}.`);
  };
  const mustFindAssessment = (id) => {
    const found = store.getAssessment(id);
    if (!found) throw new HttpError(404, 'not_found', 'That assessment does not exist.');
    return found;
  };

  route('GET', '/api/academics', () => academicsReport());

  function termDates(value) {
    const { start, end } = value ?? {};
    if (!isDay(start) || !isDay(end)) throw new HttpError(400, 'invalid', 'Semester dates look like 2026-07-27.', 'termDates');
    if (start > end) throw new HttpError(400, 'invalid', 'The semester must end after it starts.', 'termDates');
    return { start, end };
  }

  route('POST', '/api/units', ({ body }) => {
    const unit = {
      code: unitCode(body.code),
      name: check.text(body.name, 'name', { required: false }),
      term: check.text(body.term, 'term', { max: 40, required: false }) || store.getSetting('academics.currentTerm', ''),
      credit: check.number(body.credit ?? 6, 'credit', { min: 0.5, max: 48 })
    };
    if (store.getUnit(unit.code)) throw new HttpError(409, 'exists', `There is already a unit with the code ${unit.code}.`, 'code');
    return changeAcademics(() => {
      store.insertUnit(unit);
      if (unit.term) store.setSetting('academics.currentTerm', unit.term);
    });
  });

  route('PATCH', '/api/units/:code', ({ params, body }) => {
    const code = params.code.toUpperCase();
    mustFindUnit(code);
    const fields = {};
    if (body.name !== undefined) fields.name = check.text(body.name, 'name', { required: false });
    if (body.term !== undefined) fields.term = check.text(body.term, 'term', { max: 40, required: false });
    if (body.credit !== undefined) fields.credit = check.number(body.credit, 'credit', { min: 0.5, max: 48 });
    if (body.target !== undefined) fields.target = check.number(body.target, 'target', { min: 1, max: 100, nullable: true });
    if (body.passFail !== undefined) {
      if (typeof body.passFail !== 'boolean') throw new HttpError(400, 'invalid', 'Pass or fail must be true or false.', 'passFail');
      fields.passFail = body.passFail ? 1 : 0;
    }
    return changeAcademics(() => store.updateUnit(code, fields));
  });

  route('DELETE', '/api/units/:code', ({ params }) => {
    const code = params.code.toUpperCase();
    mustFindUnit(code);
    return changeAcademics(() => store.deleteUnit(code));
  });

  route('POST', '/api/units/:code/assessments', ({ params, body }) => {
    const code = params.code.toUpperCase();
    mustFindUnit(code);
    const assessment = {
      unitCode: code,
      name: check.text(body.name, 'name'),
      weight: check.number(body.weight, 'weight', { min: 0.01, max: 100 }),
      max: check.number(body.max ?? 100, 'max', { min: 0.01, max: 100000 }),
      score: body.score === undefined ? null : check.number(body.score, 'score', { min: 0, max: 100000, nullable: true }),
      hurdle: body.hurdle === undefined ? null : check.number(body.hurdle, 'hurdle', { min: 1, max: 100, nullable: true })
    };
    return changeAcademics(() => store.insertAssessment(assessment));
  });

  route('PATCH', '/api/assessments/:id', ({ params, body }) => {
    const id = check.id(params.id);
    mustFindAssessment(id);
    const fields = {};
    if (body.name !== undefined) fields.name = check.text(body.name, 'name');
    if (body.weight !== undefined) fields.weight = check.number(body.weight, 'weight', { min: 0.01, max: 100 });
    if (body.max !== undefined) fields.max = check.number(body.max, 'max', { min: 0.01, max: 100000 });
    if (body.score !== undefined) fields.score = check.number(body.score, 'score', { min: 0, max: 100000, nullable: true });
    if (body.hurdle !== undefined) fields.hurdle = check.number(body.hurdle, 'hurdle', { min: 1, max: 100, nullable: true });
    return changeAcademics(() => store.updateAssessment(id, fields));
  });

  route('DELETE', '/api/assessments/:id', ({ params }) => {
    const id = check.id(params.id);
    mustFindAssessment(id);
    return changeAcademics(() => store.deleteAssessment(id));
  });

  route('POST', '/api/results', ({ body }) => {
    const grade = check.text(body.grade, 'grade', { max: 2, required: false }).toUpperCase();
    if (grade && !GRADES.includes(grade)) throw new HttpError(400, 'invalid', 'The grade must be one of HD, D, C, P, NP, N, NH or WN.', 'grade');
    const result = {
      code: unitCode(body.code),
      name: check.text(body.name, 'name', { required: false }),
      credit: check.number(body.credit ?? 6, 'credit', { min: 0.5, max: 48 }),
      mark: check.number(body.mark, 'mark', { min: 0, max: 100 }),
      grade: grade || null,
      term: check.text(body.term, 'term', { max: 40, required: false })
    };
    return changeAcademics(() => store.insertResult(result));
  });

  route('DELETE', '/api/results/:id', ({ params }) => {
    const id = check.id(params.id);
    return changeAcademics(() => {
      if (!store.deleteResult(id)) throw new HttpError(404, 'not_found', 'That finished unit does not exist.');
    });
  });

  route('PUT', '/api/academics/settings', ({ body }) => changeAcademics(() => {
    // The current semester's first and last day, so screens can show how much of it has gone.
    if (body.termDates === null) store.setSetting('academics.termDates', null);
    else if (body.termDates !== undefined) store.setSetting('academics.termDates', termDates(body.termDates));
    if (body.currentTerm !== undefined) store.setSetting('academics.currentTerm', check.text(body.currentTerm, 'currentTerm', { max: 40, required: false }));
    if (body.margin !== undefined) store.setSetting('academics.margin', check.number(body.margin, 'margin', { min: 0, max: 100 }));
    if (body.goal === null) store.setSetting('academics.goal', null);
    else if (body.goal !== undefined) {
      const measure = check.text(body.goal.measure, 'measure', { max: 4 }).toLowerCase();
      if (!['cgpa', 'gpa', 'wam'].includes(measure)) throw new HttpError(400, 'invalid', 'A goal is for CGPA, GPA or WAM.', 'measure');
      store.setSetting('academics.goal', {
        measure,
        value: check.number(body.goal.value, 'value', { min: 0.01, max: measure === 'wam' ? 100 : 4 }),
        totalCredits: check.number(body.goal.totalCredits, 'totalCredits', { min: 1, max: 1000 })
      });
    }
  }));

  // Every slider at once: ?u=ENG1005:60&u=FIT2085:75. Gives each unit's answer and the semester totals with them.
  route('GET', '/api/academics/predict', ({ query }) => {
    const asked = query.getAll('u');
    if (asked.length === 0 || asked.length > 20) throw new HttpError(400, 'invalid', 'Send from 1 to 20 units to predict.', 'u');
    const questions = asked.map((item) => {
      const [rawCode, rawScore] = String(item).split(':');
      const code = (rawCode ?? '').toUpperCase();
      mustFindUnit(code);
      return { code, score: check.number(Number(rawScore), 'score', { min: 0, max: 100 }) };
    });
    const report = academicsReport(questions);
    return { whatIf: report.whatIf, predicted: report.predicted };
  });

  route('GET', '/api/academics/whatif', ({ query }) => {
    const code = (query.get('unit') ?? '').toUpperCase();
    mustFindUnit(code);
    const score = check.number(Number(query.get('score')), 'score', { min: 0, max: 100 });
    return academicsReport([{ code, score }]).whatIf[0];
  });

  // ================= budget =================

  function budgetFor(month) {
    const { from, to } = monthRange(month);
    const summary = budgetSummary({
      month, today: today(),
      limit: store.getSetting('budget.limit', null),
      categories: store.listCategories(),
      transactions: store.listTransactions(from, to)
    });
    const moves = store.listAccountMoves();
    // Everything spent up to the end of the month shown: the Expenses tab can look back this month, 3 months, a year or all time.
    const upToMonth = store.listTransactions('0000-01-01', to);
    const spans = spendingSpans({ categories: store.listCategories(), transactions: upToMonth, month });
    return {
      ...summary,
      income: incomeSummary(moves, month, summary.spent),
      // "Could cut" on its own looks at the three months up to the one shown, so one odd month does not decide it.
      reducible: spans['3m'],
      spans,
      byMonth: monthlySpending(upToMonth),
      advice: store.getSetting('budget.advice', null),
      // Balances are always as they are now, whichever month is being looked at.
      money: accountSummary(store.listAccounts(), moves)
    };
  }
  const budgetNow = () => budgetFor(today().slice(0, 7));
  const accountKind = (value) => {
    const kind = check.text(value ?? 'bank', 'kind', { max: 12 });
    if (!ACCOUNT_KINDS.includes(kind)) throw new HttpError(400, 'invalid', 'An account is a bank, an e-wallet, an investment or cash.', 'kind');
    return kind;
  };
  const mustFindAccount = (id) => {
    const account = store.getAccount(id);
    if (!account) throw new HttpError(404, 'not_found', 'That account does not exist.');
    return account;
  };
  const balanceValue = (value, field = 'balance') => Math.round(check.number(value, field, { min: -1e8, max: 1e9 }) * 100) / 100;
  const moveAmount = (value, field = 'amount') => Math.round(check.number(value, field, { min: 0.01, max: 1e8 }) * 100) / 100;
  const monthOf = (query) => {
    const month = query.get('month') ?? today().slice(0, 7);
    if (!isMonth(month)) throw new HttpError(400, 'invalid', 'A month looks like 2026-11.', 'month');
    return month;
  };
  // A day from the request: today when missing, never in the future.
  const dayOf = (value, field = 'date') => {
    const day = value ?? today();
    if (!isDay(day)) throw new HttpError(400, 'invalid', 'A date looks like 2026-11-21.', field);
    if (day > today()) throw new HttpError(400, 'invalid', 'The date cannot be in the future.', field);
    return day;
  };

  route('GET', '/api/budget', ({ query }) => budgetFor(monthOf(query)));

  route('PUT', '/api/budget/settings', ({ body }) => {
    store.setSetting('budget.limit', check.number(body.limit, 'limit', { min: 0, max: 1e7, nullable: true }));
    return budgetFor(today().slice(0, 7));
  });

  route('POST', '/api/budget/categories', ({ body }) => {
    const name = check.text(body.name, 'name', { max: 30 });
    if (store.getCategoryByName(name)) throw new HttpError(409, 'exists', `There is already a category called ${name}.`, 'name');
    store.insertCategory({ name, limit: check.number(body.limit ?? 0, 'limit', { min: 0, max: 1e7 }), essential: body.essential === true });
    return budgetFor(today().slice(0, 7));
  });

  route('PATCH', '/api/budget/categories/:id', ({ params, body }) => {
    const fields = {};
    if (body.name !== undefined) fields.name = check.text(body.name, 'name', { max: 30 });
    if (body.limit !== undefined) fields.limit = check.number(body.limit, 'limit', { min: 0, max: 1e7 });
    if (body.essential !== undefined) {
      if (typeof body.essential !== 'boolean') throw new HttpError(400, 'invalid', 'Essential must be true or false.', 'essential');
      fields.essential = body.essential ? 1 : 0;
    }
    const other = fields.name ? store.getCategoryByName(fields.name) : null;
    if (other && other.id !== check.id(params.id)) throw new HttpError(409, 'exists', `There is already a category called ${fields.name}.`, 'name');
    if (Object.keys(fields).length && !store.updateCategory(check.id(params.id), fields)) throw new HttpError(404, 'not_found', 'That category does not exist.');
    return budgetFor(today().slice(0, 7));
  });

  // Advice shown on the Expenses tab. For now it is written by hand (by Claude); later the AI helper fills it.
  route('PUT', '/api/budget/advice', ({ body }) => {
    if (body.text === null) store.setSetting('budget.advice', null);
    else store.setSetting('budget.advice', {
      text: check.text(String(body.text ?? '').replace(/\r?\n/g, ' \u2028 '), 'text', { max: 6000 }).replace(/ \u2028 /g, '\n'),
      by: check.text(body.by, 'by', { max: 60, required: false }) || 'You',
      on: today()
    });
    return budgetNow();
  });

  route('DELETE', '/api/budget/categories/:id', ({ params }) => {
    if (!store.deleteCategory(check.id(params.id))) throw new HttpError(404, 'not_found', 'That category does not exist.');
    return budgetFor(today().slice(0, 7));
  });

  route('POST', '/api/transactions', ({ body }) => {
    const category = store.getCategoryByName(check.text(body.category, 'category', { max: 30 }));
    if (!category) throw new HttpError(400, 'invalid', 'Pick one of your categories, or add a new one first.', 'category');
    const date = dayOf(body.date);
    const account = body.accountId === undefined || body.accountId === null || body.accountId === '' ? null : mustFindAccount(check.id(body.accountId));
    const entry = {
      categoryId: category.id,
      what: check.text(body.what, 'what', { max: 60 }),
      amount: Math.round(check.number(body.amount, 'amount', { min: 0.01, max: 1e6 }) * 100) / 100,
      date
    };
    inTransaction(db, () => {
      const id = store.insertTransaction(entry);
      // Paid from an account: that account goes down by the same amount.
      if (account) store.insertAccountMove({ accountId: account.id, kind: 'out', amount: entry.amount, date, note: entry.what, transactionId: id });
    });
    return budgetFor(date.slice(0, 7));
  });

  route('DELETE', '/api/transactions/:id', ({ params }) => {
    if (!store.deleteTransaction(check.id(params.id))) throw new HttpError(404, 'not_found', 'That spending entry does not exist.');
    return budgetFor(today().slice(0, 7));
  });

  // ================= money accounts =================

  route('POST', '/api/accounts', ({ body }) => {
    const name = check.text(body.name, 'name', { max: 30 });
    if (store.getAccountByName(name)) throw new HttpError(409, 'exists', `There is already an account called ${name}.`, 'name');
    const kind = accountKind(body.kind);
    const balance = body.balance === undefined || body.balance === null || body.balance === '' ? null : balanceValue(body.balance);
    inTransaction(db, () => {
      const id = store.insertAccount({ name, kind });
      if (balance !== null) store.insertAccountMove({ accountId: id, kind: 'set', amount: balance, date: today(), note: 'Starting balance' });
    });
    return budgetNow();
  });

  route('PATCH', '/api/accounts/:id', ({ params, body }) => {
    const account = mustFindAccount(check.id(params.id));
    const name = body.name === undefined ? account.name : check.text(body.name, 'name', { max: 30 });
    const other = store.getAccountByName(name);
    if (other && other.id !== account.id) throw new HttpError(409, 'exists', `There is already an account called ${name}.`, 'name');
    store.renameAccount(account.id, name, body.kind === undefined ? account.kind : accountKind(body.kind));
    return budgetNow();
  });

  route('DELETE', '/api/accounts/:id', ({ params }) => {
    if (!store.deleteAccount(check.id(params.id))) throw new HttpError(404, 'not_found', 'That account does not exist.');
    return budgetNow();
  });

  // The manual overwrite: "this account holds exactly this much now". Earlier moves stop counting.
  route('PUT', '/api/accounts/:id/balance', ({ params, body }) => {
    const account = mustFindAccount(check.id(params.id));
    store.insertAccountMove({ accountId: account.id, kind: 'set', amount: balanceValue(body.balance), date: dayOf(body.date), note: check.text(body.note, 'note', { max: 60, required: false }) || 'Balance set by hand' });
    return budgetNow();
  });

  route('POST', '/api/accounts/:id/income', ({ params, body }) => {
    const account = mustFindAccount(check.id(params.id));
    store.insertAccountMove({ accountId: account.id, kind: 'in', amount: moveAmount(body.amount), date: dayOf(body.date), note: check.text(body.note, 'note', { max: 60, required: false }) || 'Money in' });
    return budgetNow();
  });

  // Moving money between two of your own accounts, for example topping up Touch 'n Go from a bank.
  // It is not spending, so it does not count against the budget.
  route('POST', '/api/accounts/transfer', ({ body }) => {
    const from = mustFindAccount(check.id(body.from));
    const to = mustFindAccount(check.id(body.to));
    if (from.id === to.id) throw new HttpError(400, 'invalid', 'Pick two different accounts.', 'to');
    const amount = moveAmount(body.amount);
    const date = dayOf(body.date);
    inTransaction(db, () => {
      store.insertAccountMove({ accountId: from.id, kind: 'out', amount, date, note: `To ${to.name}`, transfer: true });
      store.insertAccountMove({ accountId: to.id, kind: 'in', amount, date, note: `From ${from.name}`, transfer: true });
    });
    return budgetNow();
  });

  route('DELETE', '/api/account-moves/:id', ({ params }) => {
    const move = store.getAccountMove(check.id(params.id));
    if (!move) throw new HttpError(404, 'not_found', 'That entry does not exist.');
    if (move.transactionId !== null) throw new HttpError(400, 'invalid', 'This came from a spending entry. Remove the spending instead.');
    store.deleteAccountMove(move.id);
    return budgetNow();
  });

  // ================= food =================

  const foodFor = (date) => foodSummary({
    date,
    targets: store.getSetting('food.targets', { kcal: 0, protein: 0 }),
    log: store.listFoodLog(date),
    foods: store.listFoods()
  });

  route('GET', '/api/food', ({ query }) => foodFor(dayOf(query.get('date') ?? undefined)));

  route('PUT', '/api/food/settings', ({ body }) => {
    store.setSetting('food.targets', {
      kcal: check.number(body.targetKcal, 'targetKcal', { min: 0, max: 10000 }),
      protein: check.number(body.targetProtein ?? 0, 'targetProtein', { min: 0, max: 1000 })
    });
    return foodFor(today());
  });

  route('POST', '/api/food/log', ({ body }) => {
    const meal = check.text(body.meal ?? 'Snack', 'meal', { max: 12 });
    if (!MEALS.includes(meal)) throw new HttpError(400, 'invalid', 'A meal is Breakfast, Lunch, Dinner or Snack.', 'meal');
    const entry = {
      date: dayOf(body.date),
      meal,
      food: check.text(body.food, 'food', { max: 60 }),
      kcal: check.number(body.kcal, 'kcal', { min: 0, max: 5000 }),
      protein: check.number(body.protein ?? 0, 'protein', { min: 0, max: 500 })
    };
    store.insertFoodLog(entry);
    if (body.remember === true) store.insertFood({ name: entry.food, kcal: entry.kcal, protein: entry.protein });
    return foodFor(entry.date);
  });

  // Forgets a remembered food. Entries already logged with it are kept.
  route('DELETE', '/api/food/items/:id', ({ params }) => {
    if (!store.deleteFood(check.id(params.id))) throw new HttpError(404, 'not_found', 'That remembered food does not exist.');
    return foodFor(today());
  });

  route('DELETE', '/api/food/log/:id', ({ params }) => {
    if (!store.deleteFoodLog(check.id(params.id))) throw new HttpError(404, 'not_found', 'That food entry does not exist.');
    return foodFor(today());
  });

  // ================= health =================

  function healthFor(date) {
    const { from, to } = weekRange(date);
    return healthSummary({
      date,
      today: today(),
      targets: store.getSetting('health.targets', { steps: 0, sleepMinutes: 0, workouts: 0 }),
      days: store.listHealthDays(from, to),
      workouts: store.listWorkouts(from, to),
      weights: store.listHealthDays(addDays(date, -365), date).filter((d) => d.weightKg !== null),
      bests: store.listExerciseBests(date)
    });
  }

  // Health targets: every one is optional. The goal weight is the user's own choice; the app only shows the distance to it.
  const healthTargets = (b) => ({
    steps: check.number(b.steps ?? 0, 'stepTarget', { min: 0, max: 100000, whole: true }),
    sleepMinutes: check.number(b.sleepMinutes ?? 0, 'sleepTargetMinutes', { min: 0, max: 1440, whole: true }),
    workouts: check.number(b.workouts ?? 0, 'workoutTarget', { min: 0, max: 21, whole: true }),
    waterMl: check.number(b.waterMl ?? 0, 'waterTarget', { min: 0, max: 10000, whole: true }),
    weightGoalKg: check.number(b.weightGoalKg ?? null, 'weightGoalKg', { min: 20, max: 400, nullable: true }),
    heightCm: check.number(b.heightCm ?? null, 'heightCm', { min: 100, max: 250, nullable: true })
  });
  const workoutKind = (value) => {
    const kind = value ?? 'other';
    if (!WORKOUT_KINDS.includes(kind)) throw new HttpError(400, 'invalid', `A workout is one of: ${WORKOUT_KINDS.join(', ')}.`, 'kind');
    return kind;
  };
  const exercise = (x) => ({
    name: check.text(x?.name, 'exerciseName', { max: 60 }),
    sets: check.number(x?.sets, 'sets', { min: 1, max: 50, whole: true }),
    reps: check.number(x?.reps, 'reps', { min: 1, max: 500, whole: true }),
    weightKg: check.number(x?.weightKg ?? null, 'weightKg', { min: 0, max: 1000, nullable: true })
  });
  const exerciseList = (value) => {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value) || value.length > 40) throw new HttpError(400, 'invalid', 'Exercises must be a list of at most 40.', 'exercises');
    return value.map(exercise);
  };

  route('GET', '/api/health', ({ query }) => healthFor(dayOf(query.get('date') ?? undefined)));

  route('PUT', '/api/health/settings', ({ body }) => {
    store.setSetting('health.targets', healthTargets({
      steps: body.stepTarget, sleepMinutes: body.sleepTargetMinutes, workouts: body.workoutTarget,
      waterMl: body.waterTarget, weightGoalKg: body.weightGoalKg, heightCm: body.heightCm
    }));
    return healthFor(today());
  });

  route('PUT', '/api/health/days/:day', ({ params, body }) => {
    const day = dayOf(params.day, 'day');
    const values = {};
    if (body.steps !== undefined) values.steps = check.number(body.steps, 'steps', { min: 0, max: 100000, whole: true, nullable: true });
    if (body.sleepMinutes !== undefined) values.sleepMinutes = check.number(body.sleepMinutes, 'sleepMinutes', { min: 0, max: 1440, whole: true, nullable: true });
    if (body.restingHr !== undefined) values.restingHr = check.number(body.restingHr, 'restingHr', { min: 20, max: 250, whole: true, nullable: true });
    if (body.weightKg !== undefined) values.weightKg = check.number(body.weightKg, 'weightKg', { min: 20, max: 400, nullable: true });
    if (body.waterMl !== undefined) values.waterMl = check.number(body.waterMl, 'waterMl', { min: 0, max: 10000, whole: true, nullable: true });
    store.saveHealthDay(day, values);
    return healthFor(day);
  });

  route('POST', '/api/workouts', ({ body }) => {
    const date = dayOf(body.date);
    const workout = {
      date,
      name: check.text(body.name, 'name', { max: 60 }),
      notes: check.text(body.notes, 'notes', { max: 300, required: false }),
      kind: workoutKind(body.kind),
      minutes: check.number(body.minutes ?? null, 'minutes', { min: 1, max: 600, whole: true, nullable: true }),
      exercises: exerciseList(body.exercises)
    };
    inTransaction(db, () => store.insertWorkout(workout));
    return healthFor(date);
  });

  route('POST', '/api/workouts/:id/exercises', ({ params, body }) => {
    const workout = store.getWorkout(check.id(params.id));
    if (!workout) throw new HttpError(404, 'not_found', 'That workout does not exist.');
    store.insertExercise(workout.id, exercise(body));
    return healthFor(workout.date);
  });

  route('DELETE', '/api/exercises/:id', ({ params }) => {
    const found = store.getExercise(check.id(params.id));
    if (!found) throw new HttpError(404, 'not_found', 'That exercise does not exist.');
    store.deleteExercise(found.id);
    return healthFor(found.date);
  });

  route('DELETE', '/api/workouts/:id', ({ params }) => {
    if (!store.deleteWorkout(check.id(params.id))) throw new HttpError(404, 'not_found', 'That workout does not exist.');
    return healthFor(today());
  });

  // ================= everything at once =================

  route('GET', '/api/status', () => ({ ok: true, version: '0.1.0', today: today(), engine: engine.available(), ai: gemini.configured, empty: store.isEmpty(), demo }));

  // One call for the home screen. If the engine is not built, the other three parts still load.
  route('GET', '/api/overview', () => {
    let academics = null, academicsError = null;
    try { academics = academicsReport(); } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      academicsError = error.message;
    }
    const day = today();
    return { today: day, academics, academicsError, budget: budgetFor(day.slice(0, 7)), food: foodFor(day), health: healthFor(day), ai: gemini.configured, empty: store.isEmpty(), demo };
  });

  // ================= the life tree =================

  // Everything ever recorded, as one tree. If the grade engine is not built, the tree is drawn without Studies.
  route('GET', '/api/life', () => {
    let report = null;
    try { report = academicsReport(); } catch (error) { if (!(error instanceof HttpError)) throw error; }
    return lifeTree({
      today: today(),
      report,
      termDates: store.getSetting('academics.termDates', null),
      goal: store.getSetting('academics.goal', null),
      transactions: store.listTransactions('0000-01-01', '9999-12-31').reverse(),
      limit: store.getSetting('budget.limit', null) ?? (store.listCategories().reduce((sum, c) => sum + c.limit, 0) || null),
      foodLog: store.listFoodLogAll(),
      foodTargets: store.getSetting('food.targets', null),
      healthDays: store.listHealthDays('0000-01-01', '9999-12-31'),
      workouts: store.listWorkouts('0000-01-01', '9999-12-31').reverse(),
      healthTargets: store.getSetting('health.targets', null)
    });
  });

  // ================= export and import =================

  route('GET', '/api/export', () => ({ format: EXPORT_FORMAT, version: 1, exportedOn: today(), ...store.exportAll() }));

  // Checks every row of an exported file with the same rules as the normal forms, so a file
  // that was edited by hand cannot put anything into the app that the forms would refuse.
  function cleanExport(file) {
    if (file.format !== EXPORT_FORMAT) throw new HttpError(400, 'invalid', 'This is not a file exported from this app.');
    if (file.version !== 1) throw new HttpError(400, 'invalid', 'This file is from a newer version of the app.');
    const list = (name, max) => {
      const rows = file[name] ?? [];
      if (!Array.isArray(rows)) throw new HttpError(400, 'invalid', `The part "${name}" of the file is damaged.`);
      if (rows.length > max) throw new HttpError(400, 'invalid', `The part "${name}" of the file has too many rows.`);
      return rows;
    };
    const day = (value, field) => {
      if (!isDay(value)) throw new HttpError(400, 'invalid', `A date in the file is not valid: ${String(value).slice(0, 20)}.`, field);
      return value;
    };
    const maybe = (value, field, range) => (value === null || value === undefined ? null : check.number(value, field, range));

    const settings = {};
    const s = file.settings ?? {};
    if (typeof s !== 'object' || Array.isArray(s)) throw new HttpError(400, 'invalid', 'The settings in the file are damaged.');
    if (s['academics.currentTerm'] !== undefined) settings['academics.currentTerm'] = check.text(s['academics.currentTerm'], 'currentTerm', { max: 40, required: false });
    if (s['academics.termDates']) settings['academics.termDates'] = termDates(s['academics.termDates']);
    if (s['academics.margin'] !== undefined) settings['academics.margin'] = check.number(s['academics.margin'], 'margin', { min: 0, max: 100 });
    if (s['academics.goal']) {
      const g = s['academics.goal'];
      if (!['cgpa', 'gpa', 'wam'].includes(g.measure)) throw new HttpError(400, 'invalid', 'The goal in the file is damaged.');
      settings['academics.goal'] = {
        measure: g.measure,
        value: check.number(g.value, 'goal', { min: 0.01, max: g.measure === 'wam' ? 100 : 4 }),
        totalCredits: check.number(g.totalCredits, 'totalCredits', { min: 1, max: 1000 })
      };
    }
    if (s['budget.limit'] !== undefined) settings['budget.limit'] = maybe(s['budget.limit'], 'limit', { min: 0, max: 1e7 });
    if (s['food.targets']) {
      settings['food.targets'] = {
        kcal: check.number(s['food.targets'].kcal, 'targetKcal', { min: 0, max: 10000 }),
        protein: check.number(s['food.targets'].protein, 'targetProtein', { min: 0, max: 1000 })
      };
    }
    if (s['health.targets']) {
      const h = s['health.targets'];
      settings['health.targets'] = healthTargets(h);
    }

    const units = list('units', 500).map((u) => ({
      code: unitCode(u.code),
      name: check.text(u.name, 'name', { required: false }),
      term: check.text(u.term, 'term', { max: 40, required: false }),
      credit: check.number(u.credit, 'credit', { min: 0.5, max: 48 }),
      target: maybe(u.target, 'target', { min: 1, max: 100 }),
      passFail: u.passFail === true
    }));
    const codes = new Set(units.map((u) => u.code));
    if (codes.size !== units.length) throw new HttpError(400, 'invalid', 'The file has the same unit twice.');

    const assessments = list('assessments', 5000).map((a) => {
      const owner = String(a.unitCode ?? '').toUpperCase();
      if (!codes.has(owner)) throw new HttpError(400, 'invalid', 'An assessment in the file belongs to a unit that is not in it.');
      return {
        unitCode: owner,
        name: check.text(a.name, 'name'),
        weight: check.number(a.weight, 'weight', { min: 0.01, max: 100 }),
        score: maybe(a.score, 'score', { min: 0, max: 100000 }),
        max: check.number(a.max ?? 100, 'max', { min: 0.01, max: 100000 }),
        hurdle: maybe(a.hurdle, 'hurdle', { min: 1, max: 100 })
      };
    });

    const results = list('results', 500).map((r) => {
      const grade = r.grade === null || r.grade === undefined ? null : String(r.grade).toUpperCase();
      if (grade !== null && !GRADES.includes(grade)) throw new HttpError(400, 'invalid', 'A grade in the file is not valid.');
      return {
        code: unitCode(r.code),
        name: check.text(r.name, 'name', { required: false }),
        credit: check.number(r.credit, 'credit', { min: 0.5, max: 48 }),
        mark: check.number(r.mark, 'mark', { min: 0, max: 100 }),
        grade,
        term: check.text(r.term, 'term', { max: 40, required: false })
      };
    });

    const categories = list('categories', 200).map((c) => ({
      id: check.number(c.id, 'id', { min: 1, max: 1e9, whole: true }),
      name: check.text(c.name, 'name', { max: 30 }),
      limit: check.number(c.limit, 'limit', { min: 0, max: 1e7 }),
      essential: c.essential === true
    }));
    const categoryIds = new Set(categories.map((c) => c.id));
    if (categoryIds.size !== categories.length || new Set(categories.map((c) => c.name.toLowerCase())).size !== categories.length) {
      throw new HttpError(400, 'invalid', 'The file has the same budget category twice.');
    }
    const transactions = list('transactions', 50000).map((t) => {
      if (!categoryIds.has(t.categoryId)) throw new HttpError(400, 'invalid', 'A spending entry in the file has no category.');
      return {
        categoryId: t.categoryId,
        what: check.text(t.what, 'what', { max: 60 }),
        amount: check.number(t.amount, 'amount', { min: 0.01, max: 1e6 }),
        date: day(t.date, 'date')
      };
    });

    const foods = list('foods', 2000).map((f) => ({
      name: check.text(f.name, 'food', { max: 60 }),
      kcal: check.number(f.kcal, 'kcal', { min: 0, max: 5000 }),
      protein: check.number(f.protein ?? 0, 'protein', { min: 0, max: 500 })
    }));
    const foodLog = list('foodLog', 50000).map((e) => {
      if (!MEALS.includes(e.meal)) throw new HttpError(400, 'invalid', 'A meal in the file is not valid.');
      return {
        date: day(e.date, 'date'), meal: e.meal,
        food: check.text(e.food, 'food', { max: 60 }),
        kcal: check.number(e.kcal, 'kcal', { min: 0, max: 5000 }),
        protein: check.number(e.protein ?? 0, 'protein', { min: 0, max: 500 })
      };
    });

    const healthDays = list('healthDays', 20000).map((d) => ({
      day: day(d.day, 'day'),
      steps: maybe(d.steps, 'steps', { min: 0, max: 100000, whole: true }),
      sleepMinutes: maybe(d.sleepMinutes, 'sleepMinutes', { min: 0, max: 1440, whole: true }),
      restingHr: maybe(d.restingHr, 'restingHr', { min: 20, max: 250, whole: true }),
      weightKg: maybe(d.weightKg, 'weightKg', { min: 20, max: 400 }),
      waterMl: maybe(d.waterMl, 'waterMl', { min: 0, max: 10000, whole: true })
    }));
    const workouts = list('workouts', 20000).map((w) => ({
      date: day(w.date, 'date'),
      name: check.text(w.name, 'name', { max: 60 }),
      notes: check.text(w.notes, 'notes', { max: 300, required: false }),
      kind: workoutKind(w.kind),
      minutes: maybe(w.minutes, 'minutes', { min: 1, max: 600, whole: true }),
      exercises: exerciseList(w.exercises)
    }));

    const accounts = list('accounts', 100).map((a) => ({
      id: check.number(a.id, 'id', { min: 1, max: 1e9, whole: true }),
      name: check.text(a.name, 'name', { max: 30 }),
      kind: accountKind(a.kind)
    }));
    const accountIds = new Set(accounts.map((a) => a.id));
    if (accountIds.size !== accounts.length || new Set(accounts.map((a) => a.name.toLowerCase())).size !== accounts.length) {
      throw new HttpError(400, 'invalid', 'The file has the same account twice.');
    }
    const usedSpending = new Set();
    const accountMoves = list('accountMoves', 100000).map((m) => {
      if (!accountIds.has(m.accountId)) throw new HttpError(400, 'invalid', 'An account entry in the file has no account.');
      if (!['set', 'in', 'out'].includes(m.kind)) throw new HttpError(400, 'invalid', 'An account entry in the file is damaged.');
      const transaction = m.transaction === null || m.transaction === undefined ? null : check.number(m.transaction, 'transaction', { min: 0, max: transactions.length - 1, whole: true });
      if (transaction !== null && (m.kind !== 'out' || usedSpending.has(transaction))) throw new HttpError(400, 'invalid', 'An account entry in the file is damaged.');
      if (transaction !== null) usedSpending.add(transaction);
      return {
        accountId: m.accountId, kind: m.kind,
        amount: m.kind === 'set' ? balanceValue(m.amount, 'amount') : moveAmount(m.amount),
        date: day(m.date, 'date'),
        note: check.text(m.note, 'note', { max: 60, required: false }),
        transaction,
        transfer: m.transfer === true
      };
    });
    return { settings, units, assessments, results, categories, transactions, foods, foodLog, healthDays, workouts, accounts, accountMoves };
  }

  // Loads an exported file into an empty app. Everything is checked first, and the grade
  // engine must accept the result, or nothing at all is kept.
  route('POST', '/api/import', ({ body }) => {
    if (!store.isEmpty()) throw new HttpError(409, 'not_empty', 'A file can only be loaded into an empty app. Delete your data first.');
    const clean = cleanExport(body);
    inTransaction(db, () => {
      store.wipe();               // removes settings, categories and remembered foods, which do not count as "data" above
      store.importAll(clean);
      academicsReport();
    });
    return { ok: true };
  }, PICTURE);

  route('POST', '/api/demo', () => {
    if (!store.isEmpty()) throw new HttpError(409, 'not_empty', 'Example data can only be loaded into an empty app. Delete your data first.');
    inTransaction(db, () => loadDemo(store, today()));
    return { ok: true };
  });

  route('DELETE', '/api/data', ({ body }) => {
    if (body.confirm !== 'delete everything') throw new HttpError(400, 'not_confirmed', 'To delete all your data, send confirm: "delete everything".');
    inTransaction(db, () => store.wipe());
    return { ok: true };
  });

  // ================= the AI helper =================

  // Only this short summary goes to the AI: codes, targets and verdicts. No names, no raw marks.
  route('POST', '/api/advisor/plan', async () => {
    const report = academicsReport();
    if (report.units.length === 0) throw new HttpError(400, 'nothing_to_plan', 'Add a unit with a target first. Then the helper has something to plan for.');
    const summary = {
      semester: report.currentTerm,
      units: report.units.map((u) => ({
        code: u.code,
        target: u.target?.grade ?? null,
        averageSoFar: u.standing.average === null ? null : Math.round(u.standing.average),
        percentOfUnitLeft: u.standing.leftWeight,
        markNeededOnTheRest: u.standing.need === null ? null : Math.round(u.standing.needMax),
        possible: u.standing.possible, realistic: u.standing.realistic,
        highestRealisticGrade: u.standing.bestRealisticGrade,
        toDo: u.assessments.filter((a) => !a.done).map((a) => ({ name: a.name, weight: a.weight }))
      })),
      goal: report.goal ? { measure: report.goal.measure, value: report.goal.value, averageNeeded: report.goal.need } : null
    };
    return { plan: await gemini.plan(summary), model: gemini.model };
  });

  // Reads a screenshot and returns what it found. Nothing is saved here: the user checks it first.
  route('POST', '/api/import/screenshot', async ({ body }) => {
    const mimeType = check.text(body.mimeType, 'mimeType', { max: 20 });
    if (!IMAGE_TYPES.includes(mimeType)) throw new HttpError(400, 'invalid', 'The picture must be a PNG, JPEG or WebP file.', 'mimeType');
    if (typeof body.image !== 'string' || !/^[A-Za-z0-9+/]+=*$/.test(body.image) || body.image.length < 100) {
      throw new HttpError(400, 'invalid', 'The picture did not arrive properly. Choose the file again.', 'image');
    }
    return { items: await gemini.readScreenshot(body.image, mimeType) };
  }, PICTURE);

  // ================= handling one request =================

  const tokenMatches = (header) => {
    const given = Buffer.from((header ?? '').replace(/^Bearer /, ''));
    const wanted = Buffer.from(token);
    return given.length === wanted.length && timingSafeEqual(given, wanted);
  };

  // Wrong tokens are counted per address. After 5 wrong guesses in 15 minutes,
  // that address is refused until the 15 minutes have passed.
  const GUESSES = 5, WINDOW = 15 * 60 * 1000;
  const wrongGuesses = new Map();   // address -> { count, since }
  function checkToken(req) {
    const address = req.socket.remoteAddress ?? 'unknown';
    const record = wrongGuesses.get(address);
    if (record && now() - record.since > WINDOW) wrongGuesses.delete(address);
    const current = wrongGuesses.get(address);
    if (current && current.count >= GUESSES) {
      throw new HttpError(429, 'too_many_guesses', 'Too many wrong tokens. Wait 15 minutes, then try again.');
    }
    if (tokenMatches(req.headers.authorization)) {
      wrongGuesses.delete(address);
      return;
    }
    if (current) current.count += 1;
    else wrongGuesses.set(address, { count: 1, since: now() });
    throw new HttpError(401, 'no_token', 'This app is locked. Enter the access token.');
  }

  return async function handle(req, res) {
    const started = Date.now();
    const url = new URL(req.url, 'http://localhost');
    const isApi = url.pathname.startsWith('/api/');
    let status = 200;
    try {
      if (!isApi) {
        if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'wrong_method', 'That address only supports GET.');
        if (!(await sendStatic(webDir, url.pathname, res))) throw new HttpError(404, 'not_found', 'There is nothing at that address.');
        return;
      }
      if (token) checkToken(req);
      const found = router.find(req.method, url.pathname);
      if (found === 'wrong-method') throw new HttpError(405, 'wrong_method', `That address does not support ${req.method}.`);
      if (!found) throw new HttpError(404, 'not_found', 'There is nothing at that address.');
      let body = {};
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        // Every change must say it is JSON. A form on another website cannot send that header,
        // so a page the user happens to visit cannot change the data behind their back.
        if (!(req.headers['content-type'] ?? '').startsWith('application/json')) {
          throw new HttpError(415, 'not_json', 'Changes must be sent as JSON.');
        }
        body = await readJson(req, found.handler.limit);
      }
      const result = await found.handler.handler({ params: found.params, query: url.searchParams, body });
      sendJson(res, 200, result);
    } catch (error) {
      const known = error instanceof HttpError;
      status = known ? error.status : 500;
      if (!known) log({ level: 'error', message: error.message, stack: error.stack });
      if (res.headersSent) { res.end(); return; }
      sendJson(res, status, { error: { code: known ? error.code : 'server_error', message: known ? error.message : 'Something went wrong on the server. Nothing was changed.', field: known ? error.field : undefined } });
    } finally {
      // One line per API call. No request bodies are logged: they hold marks, money and health data.
      if (isApi) log({ level: 'info', method: req.method, path: url.pathname, status, ms: Date.now() - started });
    }
  };
}
