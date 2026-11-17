// The API: every address the web app can call, and what each one does.
//
// Each handler is short on purpose. It checks the input, asks the store to
// read or write, asks the domain (or the C++ engine) to work things out, and
// returns plain data. The full list of addresses is in docs/02-design/api.md.

import { timingSafeEqual } from 'node:crypto';

import { inTransaction } from './db.js';
import { budgetSummary, foodSummary, healthSummary, isDay, isMonth, monthRange, todayIn, weekRange } from './domain.js';
import { EngineMissing } from './engine.js';
import { HttpError, check, createRouter, readJson, sendJson, sendStatic } from './http.js';
import { loadDemo } from './seed.js';

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const GRADES = ['HD', 'D', 'C', 'P', 'NP', 'N', 'NH', 'WN'];
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const SMALL = 64 * 1024;            // size limit for normal requests
const PICTURE = 8 * 1024 * 1024;    // size limit for a screenshot

export function createApp({ db, store, engine, gemini, webDir, today = () => todayIn(), token = '', log = () => {}, now = () => Date.now() }) {
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
    report.settings = { currentTerm: state.currentTerm, margin: state.margin, goal: state.goal };
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

  route('GET', '/api/academics/whatif', ({ query }) => {
    const code = (query.get('unit') ?? '').toUpperCase();
    mustFindUnit(code);
    const score = check.number(Number(query.get('score')), 'score', { min: 0, max: 100 });
    return academicsReport([{ code, score }]).whatIf[0];
  });

  // ================= budget =================

  function budgetFor(month) {
    const { from, to } = monthRange(month);
    return budgetSummary({
      month, today: today(),
      limit: store.getSetting('budget.limit', null),
      categories: store.listCategories(),
      transactions: store.listTransactions(from, to)
    });
  }
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
    store.insertCategory({ name, limit: check.number(body.limit ?? 0, 'limit', { min: 0, max: 1e7 }) });
    return budgetFor(today().slice(0, 7));
  });

  route('PATCH', '/api/budget/categories/:id', ({ params, body }) => {
    const fields = {};
    if (body.name !== undefined) fields.name = check.text(body.name, 'name', { max: 30 });
    if (body.limit !== undefined) fields.limit = check.number(body.limit, 'limit', { min: 0, max: 1e7 });
    const other = fields.name ? store.getCategoryByName(fields.name) : null;
    if (other && other.id !== check.id(params.id)) throw new HttpError(409, 'exists', `There is already a category called ${fields.name}.`, 'name');
    if (Object.keys(fields).length && !store.updateCategory(check.id(params.id), fields)) throw new HttpError(404, 'not_found', 'That category does not exist.');
    return budgetFor(today().slice(0, 7));
  });

  route('DELETE', '/api/budget/categories/:id', ({ params }) => {
    if (!store.deleteCategory(check.id(params.id))) throw new HttpError(404, 'not_found', 'That category does not exist.');
    return budgetFor(today().slice(0, 7));
  });

  route('POST', '/api/transactions', ({ body }) => {
    const category = store.getCategoryByName(check.text(body.category, 'category', { max: 30 }));
    if (!category) throw new HttpError(400, 'invalid', 'Pick one of your categories, or add a new one first.', 'category');
    const date = dayOf(body.date);
    store.insertTransaction({
      categoryId: category.id,
      what: check.text(body.what, 'what', { max: 60 }),
      amount: Math.round(check.number(body.amount, 'amount', { min: 0.01, max: 1e6 }) * 100) / 100,
      date
    });
    return budgetFor(date.slice(0, 7));
  });

  route('DELETE', '/api/transactions/:id', ({ params }) => {
    if (!store.deleteTransaction(check.id(params.id))) throw new HttpError(404, 'not_found', 'That spending entry does not exist.');
    return budgetFor(today().slice(0, 7));
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
      workouts: store.listWorkouts(from, to)
    });
  }

  route('GET', '/api/health', ({ query }) => healthFor(dayOf(query.get('date') ?? undefined)));

  route('PUT', '/api/health/settings', ({ body }) => {
    store.setSetting('health.targets', {
      steps: check.number(body.stepTarget ?? 0, 'stepTarget', { min: 0, max: 100000, whole: true }),
      sleepMinutes: check.number(body.sleepTargetMinutes ?? 0, 'sleepTargetMinutes', { min: 0, max: 1440, whole: true }),
      workouts: check.number(body.workoutTarget ?? 0, 'workoutTarget', { min: 0, max: 21, whole: true })
    });
    return healthFor(today());
  });

  route('PUT', '/api/health/days/:day', ({ params, body }) => {
    const day = dayOf(params.day, 'day');
    const values = {};
    if (body.steps !== undefined) values.steps = check.number(body.steps, 'steps', { min: 0, max: 100000, whole: true, nullable: true });
    if (body.sleepMinutes !== undefined) values.sleepMinutes = check.number(body.sleepMinutes, 'sleepMinutes', { min: 0, max: 1440, whole: true, nullable: true });
    if (body.restingHr !== undefined) values.restingHr = check.number(body.restingHr, 'restingHr', { min: 20, max: 250, whole: true, nullable: true });
    store.saveHealthDay(day, values);
    return healthFor(day);
  });

  route('POST', '/api/workouts', ({ body }) => {
    const date = dayOf(body.date);
    store.insertWorkout({ date, name: check.text(body.name, 'name', { max: 60 }), notes: check.text(body.notes, 'notes', { max: 300, required: false }) });
    return healthFor(date);
  });

  route('DELETE', '/api/workouts/:id', ({ params }) => {
    if (!store.deleteWorkout(check.id(params.id))) throw new HttpError(404, 'not_found', 'That workout does not exist.');
    return healthFor(today());
  });

  // ================= everything at once =================

  route('GET', '/api/status', () => ({ ok: true, version: '0.1.0', today: today(), engine: engine.available(), ai: gemini.configured, empty: store.isEmpty() }));

  // One call for the home screen. If the engine is not built, the other three parts still load.
  route('GET', '/api/overview', () => {
    let academics = null, academicsError = null;
    try { academics = academicsReport(); } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      academicsError = error.message;
    }
    const day = today();
    return { today: day, academics, academicsError, budget: budgetFor(day.slice(0, 7)), food: foodFor(day), health: healthFor(day), ai: gemini.configured, empty: store.isEmpty() };
  });

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
