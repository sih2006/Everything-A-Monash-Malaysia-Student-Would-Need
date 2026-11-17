// The repository layer: every SQL statement in the app lives in this file.
//
// The rest of the backend asks for things in plain words ("list the units",
// "insert a transaction") and never writes SQL. To move to another database,
// only this file has to be rewritten to offer the same functions.

// Columns that an update is allowed to change, per table. Anything else is ignored.
const EDITABLE = {
  units: { name: 'name', term: 'term', credit: 'credit', target: 'target', passFail: 'pass_fail' },
  assessments: { name: 'name', weight: 'weight', score: 'score', max: 'max', hurdle: 'hurdle' },
  budget_categories: { name: 'name', limit: 'monthly_limit' }
};

export function createStore(db) {
  // Builds "UPDATE table SET a = ?, b = ? WHERE key = ?" from the fields that were given.
  function update(table, keyColumn, keyValue, fields) {
    const columns = [];
    const values = [];
    for (const [field, column] of Object.entries(EDITABLE[table])) {
      if (fields[field] === undefined) continue;
      columns.push(`${column} = ?`);
      values.push(fields[field]);
    }
    if (columns.length === 0) return 0;
    return db.prepare(`UPDATE ${table} SET ${columns.join(', ')} WHERE ${keyColumn} = ?`).run(...values, keyValue).changes;
  }

  return {
    // ----- settings: small values kept as JSON text -----
    getSetting(key, fallback = null) {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
      return row ? JSON.parse(row.value) : fallback;
    },
    setSetting(key, value) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
        .run(key, JSON.stringify(value));
    },

    // ----- academics -----
    listUnits: () => db.prepare('SELECT code, name, term, credit, target, pass_fail AS passFail FROM units ORDER BY code').all().map((u) => ({ ...u, passFail: u.passFail === 1 })),
    getUnit: (code) => db.prepare('SELECT code, name, term, credit, target FROM units WHERE code = ?').get(code),
    insertUnit: (u) => db.prepare('INSERT INTO units (code, name, term, credit) VALUES (?, ?, ?, ?)').run(u.code, u.name, u.term, u.credit),
    updateUnit: (code, fields) => update('units', 'code', code, fields),
    deleteUnit: (code) => db.prepare('DELETE FROM units WHERE code = ?').run(code).changes,

    listAssessments: () => db.prepare('SELECT id, unit_code AS unitCode, name, weight, score, max, hurdle FROM assessments ORDER BY unit_code, id').all(),
    getAssessment: (id) => db.prepare('SELECT id, unit_code AS unitCode, name, weight, score, max, hurdle FROM assessments WHERE id = ?').get(id),
    insertAssessment: (a) => Number(db.prepare('INSERT INTO assessments (unit_code, name, weight, score, max, hurdle) VALUES (?, ?, ?, ?, ?, ?)')
      .run(a.unitCode, a.name, a.weight, a.score ?? null, a.max ?? 100, a.hurdle ?? null).lastInsertRowid),
    updateAssessment: (id, fields) => update('assessments', 'id', id, fields),
    deleteAssessment: (id) => db.prepare('DELETE FROM assessments WHERE id = ?').run(id).changes,

    listResults: () => db.prepare('SELECT id, code, name, credit, mark, grade, term FROM results ORDER BY id').all(),
    insertResult: (r) => Number(db.prepare('INSERT INTO results (code, name, credit, mark, grade, term) VALUES (?, ?, ?, ?, ?, ?)')
      .run(r.code, r.name, r.credit, r.mark, r.grade ?? null, r.term).lastInsertRowid),
    deleteResult: (id) => db.prepare('DELETE FROM results WHERE id = ?').run(id).changes,

    // ----- budget -----
    listCategories: () => db.prepare('SELECT id, name, monthly_limit AS "limit" FROM budget_categories ORDER BY id').all(),
    getCategoryByName: (name) => db.prepare('SELECT id, name, monthly_limit AS "limit" FROM budget_categories WHERE name = ? COLLATE NOCASE').get(name),
    insertCategory: (c) => Number(db.prepare('INSERT INTO budget_categories (name, monthly_limit) VALUES (?, ?)').run(c.name, c.limit).lastInsertRowid),
    updateCategory: (id, fields) => update('budget_categories', 'id', id, fields),
    deleteCategory: (id) => db.prepare('DELETE FROM budget_categories WHERE id = ?').run(id).changes,

    // Transactions from `from` to `to` (both days included), newest first.
    listTransactions: (from, to) => db.prepare(`
      SELECT t.id, t.what, t.amount, t.spent_on AS date, c.id AS categoryId, c.name AS category, a.name AS account
      FROM transactions t JOIN budget_categories c ON c.id = t.category_id
      LEFT JOIN account_moves m ON m.transaction_id = t.id
      LEFT JOIN accounts a ON a.id = m.account_id
      WHERE t.spent_on BETWEEN ? AND ? ORDER BY t.spent_on DESC, t.id DESC`).all(from, to),
    insertTransaction: (t) => Number(db.prepare('INSERT INTO transactions (category_id, what, amount, spent_on) VALUES (?, ?, ?, ?)')
      .run(t.categoryId, t.what, t.amount, t.date).lastInsertRowid),
    deleteTransaction: (id) => db.prepare('DELETE FROM transactions WHERE id = ?').run(id).changes,

    // ----- money accounts -----
    listAccounts: () => db.prepare('SELECT id, name, kind FROM accounts ORDER BY id').all(),
    getAccount: (id) => db.prepare('SELECT id, name, kind FROM accounts WHERE id = ?').get(id),
    getAccountByName: (name) => db.prepare('SELECT id, name, kind FROM accounts WHERE name = ? COLLATE NOCASE').get(name),
    insertAccount: (a) => Number(db.prepare('INSERT INTO accounts (name, kind) VALUES (?, ?)').run(a.name, a.kind).lastInsertRowid),
    renameAccount: (id, name, kind) => db.prepare('UPDATE accounts SET name = ?, kind = ? WHERE id = ?').run(name, kind, id).changes,
    deleteAccount: (id) => db.prepare('DELETE FROM accounts WHERE id = ?').run(id).changes,
    // Every move of every account, in the order they were entered. The order is what decides a balance.
    listAccountMoves: () => db.prepare(`SELECT id, account_id AS accountId, kind, amount, moved_on AS date, note, transaction_id AS transactionId, transfer
      FROM account_moves ORDER BY id`).all().map((m) => ({ ...m, transfer: m.transfer === 1 })),
    insertAccountMove: (m) => Number(db.prepare('INSERT INTO account_moves (account_id, kind, amount, moved_on, note, transaction_id, transfer) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(m.accountId, m.kind, m.amount, m.date, m.note ?? '', m.transactionId ?? null, m.transfer ? 1 : 0).lastInsertRowid),
    getAccountMove: (id) => db.prepare('SELECT id, transaction_id AS transactionId FROM account_moves WHERE id = ?').get(id),
    deleteAccountMove: (id) => db.prepare('DELETE FROM account_moves WHERE id = ?').run(id).changes,

    // ----- food -----
    listFoods: () => db.prepare('SELECT id, name, kcal, protein FROM foods ORDER BY name').all(),
    insertFood: (f) => db.prepare('INSERT INTO foods (name, kcal, protein) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET kcal = excluded.kcal, protein = excluded.protein')
      .run(f.name, f.kcal, f.protein),
    deleteFood: (id) => db.prepare('DELETE FROM foods WHERE id = ?').run(id).changes,
    listFoodLogAll: () => db.prepare('SELECT id, eaten_on AS date, meal, food, kcal, protein FROM food_log ORDER BY eaten_on, id').all(),
    listFoodLog: (day) => db.prepare('SELECT id, eaten_on AS date, meal, food, kcal, protein FROM food_log WHERE eaten_on = ? ORDER BY id').all(day),
    insertFoodLog: (e) => Number(db.prepare('INSERT INTO food_log (eaten_on, meal, food, kcal, protein) VALUES (?, ?, ?, ?, ?)')
      .run(e.date, e.meal, e.food, e.kcal, e.protein).lastInsertRowid),
    deleteFoodLog: (id) => db.prepare('DELETE FROM food_log WHERE id = ?').run(id).changes,

    // ----- health -----
    listHealthDays: (from, to) => db.prepare('SELECT day, steps, sleep_minutes AS sleepMinutes, resting_hr AS restingHr, weight_kg AS weightKg, water_ml AS waterMl FROM health_days WHERE day BETWEEN ? AND ? ORDER BY day').all(from, to),
    // Saves one day. Only the values that were given are changed.
    saveHealthDay(day, v) {
      db.prepare('INSERT INTO health_days (day) VALUES (?) ON CONFLICT(day) DO NOTHING').run(day);
      if (v.steps !== undefined) db.prepare('UPDATE health_days SET steps = ? WHERE day = ?').run(v.steps, day);
      if (v.sleepMinutes !== undefined) db.prepare('UPDATE health_days SET sleep_minutes = ? WHERE day = ?').run(v.sleepMinutes, day);
      if (v.restingHr !== undefined) db.prepare('UPDATE health_days SET resting_hr = ? WHERE day = ?').run(v.restingHr, day);
      if (v.weightKg !== undefined) db.prepare('UPDATE health_days SET weight_kg = ? WHERE day = ?').run(v.weightKg, day);
      if (v.waterMl !== undefined) db.prepare('UPDATE health_days SET water_ml = ? WHERE day = ?').run(v.waterMl, day);
    },
    // Each workout comes with its exercises, read in one query for the whole range.
    listWorkouts(from, to) {
      const workouts = db.prepare('SELECT id, done_on AS date, name, notes, kind, minutes FROM workouts WHERE done_on BETWEEN ? AND ? ORDER BY done_on DESC, id DESC').all(from, to);
      const exercises = db.prepare(`SELECT e.id, e.workout_id AS workoutId, e.name, e.sets, e.reps, e.weight_kg AS weightKg
        FROM exercises e JOIN workouts w ON w.id = e.workout_id WHERE w.done_on BETWEEN ? AND ? ORDER BY e.id`).all(from, to);
      const byWorkout = new Map(workouts.map((w) => [w.id, (w.exercises = [])]));
      for (const { workoutId, ...x } of exercises) byWorkout.get(workoutId)?.push(x);
      return workouts;
    },
    getWorkout: (id) => db.prepare('SELECT id, done_on AS date, name FROM workouts WHERE id = ?').get(id),
    insertWorkout(w) {
      const id = Number(db.prepare('INSERT INTO workouts (done_on, name, notes, kind, minutes) VALUES (?, ?, ?, ?, ?)')
        .run(w.date, w.name, w.notes ?? '', w.kind ?? 'other', w.minutes ?? null).lastInsertRowid);
      for (const x of w.exercises ?? []) this.insertExercise(id, x);
      return id;
    },
    deleteWorkout: (id) => db.prepare('DELETE FROM workouts WHERE id = ?').run(id).changes,
    insertExercise: (workoutId, x) => Number(db.prepare('INSERT INTO exercises (workout_id, name, sets, reps, weight_kg) VALUES (?, ?, ?, ?, ?)')
      .run(workoutId, x.name, x.sets, x.reps, x.weightKg ?? null).lastInsertRowid),
    getExercise: (id) => db.prepare('SELECT e.id, w.done_on AS date FROM exercises e JOIN workouts w ON w.id = e.workout_id WHERE e.id = ?').get(id),
    deleteExercise: (id) => db.prepare('DELETE FROM exercises WHERE id = ?').run(id).changes,
    // The heaviest weight lifted for each exercise up to a day. Names are matched without caring about capitals.
    listExerciseBests: (upTo) => db.prepare(`SELECT MIN(e.name) AS name, MAX(e.weight_kg) AS weightKg, COUNT(*) AS times
        FROM exercises e JOIN workouts w ON w.id = e.workout_id
        WHERE w.done_on <= ? AND e.weight_kg IS NOT NULL GROUP BY lower(e.name) ORDER BY lower(e.name)`).all(upTo),

    // ----- everything -----

    // Every row the user has entered, in a plain shape that does not depend on the database.
    // Database ids are left out, except where one row points at another (spending at its category).
    exportAll() {
      const all = (sql) => db.prepare(sql).all();
      const data = {
        settings: Object.fromEntries(all('SELECT key, value FROM settings ORDER BY key').map((r) => [r.key, JSON.parse(r.value)])),
        units: this.listUnits(),
        assessments: all('SELECT unit_code AS unitCode, name, weight, score, max, hurdle FROM assessments ORDER BY unit_code, id'),
        results: all('SELECT code, name, credit, mark, grade, term FROM results ORDER BY id'),
        categories: all('SELECT id, name, monthly_limit AS "limit" FROM budget_categories ORDER BY id'),
        transactions: all('SELECT id, category_id AS categoryId, what, amount, spent_on AS date FROM transactions ORDER BY spent_on, id'),
        foods: all('SELECT name, kcal, protein FROM foods ORDER BY name'),
        foodLog: all('SELECT eaten_on AS date, meal, food, kcal, protein FROM food_log ORDER BY eaten_on, id'),
        healthDays: all('SELECT day, steps, sleep_minutes AS sleepMinutes, resting_hr AS restingHr, weight_kg AS weightKg, water_ml AS waterMl FROM health_days ORDER BY day'),
        workouts: this.listWorkouts('0000-01-01', '9999-12-31').reverse().map(({ id, exercises, ...w }) => ({ ...w, exercises: exercises.map(({ id: _, ...x }) => x) })),
        accounts: all('SELECT id, name, kind FROM accounts ORDER BY id'),
        accountMoves: all('SELECT account_id AS accountId, kind, amount, moved_on AS date, note, transaction_id AS transactionId, transfer FROM account_moves ORDER BY id').map((m) => ({ ...m, transfer: m.transfer === 1 }))
      };
      // A move made by spending points at that spending by its place in the list, not by a database id.
      const place = new Map(data.transactions.map((t, i) => [t.id, i]));
      for (const t of data.transactions) delete t.id;
      for (const m of data.accountMoves) {
        m.transaction = m.transactionId === null ? null : place.get(m.transactionId);
        delete m.transactionId;
      }
      return data;
    },

    // Puts back what exportAll gave. The data must already be checked. Categories get new ids,
    // and each spending entry is pointed at its category's new id.
    importAll(data) {
      for (const [key, value] of Object.entries(data.settings)) this.setSetting(key, value);
      for (const u of data.units) {
        this.insertUnit(u);
        if (u.target !== null) this.updateUnit(u.code, { target: u.target });
        if (u.passFail) this.updateUnit(u.code, { passFail: 1 });
      }
      for (const a of data.assessments) this.insertAssessment(a);
      for (const r of data.results) this.insertResult(r);
      const newId = new Map();
      for (const c of data.categories) newId.set(c.id, this.insertCategory(c));
      const transactionIds = data.transactions.map((t) => this.insertTransaction({ ...t, categoryId: newId.get(t.categoryId) }));
      for (const f of data.foods) this.insertFood(f);
      for (const e of data.foodLog) this.insertFoodLog(e);
      for (const d of data.healthDays) this.saveHealthDay(d.day, d);
      for (const w of data.workouts) this.insertWorkout(w);
      const accountId = new Map();
      for (const a of data.accounts) accountId.set(a.id, this.insertAccount(a));
      for (const m of data.accountMoves) {
        this.insertAccountMove({ ...m, accountId: accountId.get(m.accountId), transactionId: m.transaction === null ? null : transactionIds[m.transaction] });
      }
    },
    isEmpty() {
      const tables = ['units', 'results', 'transactions', 'food_log', 'health_days', 'workouts', 'account_moves'];
      return tables.every((table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n === 0);
    },
    // Deletes every row the user has entered. The user asked for this; there is no undo.
    wipe() {
      for (const table of ['account_moves', 'accounts', 'assessments', 'units', 'results', 'transactions', 'budget_categories', 'food_log', 'foods', 'health_days', 'exercises', 'workouts', 'settings']) {
        db.exec(`DELETE FROM ${table}`);
      }
    }
  };
}
