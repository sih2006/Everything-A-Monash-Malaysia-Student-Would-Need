// The repository layer: every SQL statement in the app lives in this file.
//
// The rest of the backend asks for things in plain words ("list the units",
// "insert a transaction") and never writes SQL. To move to another database,
// only this file has to be rewritten to offer the same functions.

// Columns that an update is allowed to change, per table. Anything else is ignored.
const EDITABLE = {
  units: { name: 'name', term: 'term', credit: 'credit', target: 'target' },
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
    listUnits: () => db.prepare('SELECT code, name, term, credit, target FROM units ORDER BY code').all(),
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
      SELECT t.id, t.what, t.amount, t.spent_on AS date, c.id AS categoryId, c.name AS category
      FROM transactions t JOIN budget_categories c ON c.id = t.category_id
      WHERE t.spent_on BETWEEN ? AND ? ORDER BY t.spent_on DESC, t.id DESC`).all(from, to),
    insertTransaction: (t) => Number(db.prepare('INSERT INTO transactions (category_id, what, amount, spent_on) VALUES (?, ?, ?, ?)')
      .run(t.categoryId, t.what, t.amount, t.date).lastInsertRowid),
    deleteTransaction: (id) => db.prepare('DELETE FROM transactions WHERE id = ?').run(id).changes,

    // ----- food -----
    listFoods: () => db.prepare('SELECT id, name, kcal, protein FROM foods ORDER BY name').all(),
    insertFood: (f) => db.prepare('INSERT INTO foods (name, kcal, protein) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET kcal = excluded.kcal, protein = excluded.protein')
      .run(f.name, f.kcal, f.protein),
    deleteFood: (id) => db.prepare('DELETE FROM foods WHERE id = ?').run(id).changes,
    listFoodLog: (day) => db.prepare('SELECT id, eaten_on AS date, meal, food, kcal, protein FROM food_log WHERE eaten_on = ? ORDER BY id').all(day),
    insertFoodLog: (e) => Number(db.prepare('INSERT INTO food_log (eaten_on, meal, food, kcal, protein) VALUES (?, ?, ?, ?, ?)')
      .run(e.date, e.meal, e.food, e.kcal, e.protein).lastInsertRowid),
    deleteFoodLog: (id) => db.prepare('DELETE FROM food_log WHERE id = ?').run(id).changes,

    // ----- health -----
    listHealthDays: (from, to) => db.prepare('SELECT day, steps, sleep_minutes AS sleepMinutes, resting_hr AS restingHr FROM health_days WHERE day BETWEEN ? AND ? ORDER BY day').all(from, to),
    // Saves one day. Only the values that were given are changed.
    saveHealthDay(day, v) {
      db.prepare('INSERT INTO health_days (day) VALUES (?) ON CONFLICT(day) DO NOTHING').run(day);
      if (v.steps !== undefined) db.prepare('UPDATE health_days SET steps = ? WHERE day = ?').run(v.steps, day);
      if (v.sleepMinutes !== undefined) db.prepare('UPDATE health_days SET sleep_minutes = ? WHERE day = ?').run(v.sleepMinutes, day);
      if (v.restingHr !== undefined) db.prepare('UPDATE health_days SET resting_hr = ? WHERE day = ?').run(v.restingHr, day);
    },
    listWorkouts: (from, to) => db.prepare('SELECT id, done_on AS date, name, notes FROM workouts WHERE done_on BETWEEN ? AND ? ORDER BY done_on DESC, id DESC').all(from, to),
    insertWorkout: (w) => Number(db.prepare('INSERT INTO workouts (done_on, name, notes) VALUES (?, ?, ?)').run(w.date, w.name, w.notes ?? '').lastInsertRowid),
    deleteWorkout: (id) => db.prepare('DELETE FROM workouts WHERE id = ?').run(id).changes,

    // ----- everything -----

    // Every row the user has entered, in a plain shape that does not depend on the database.
    // Database ids are left out, except where one row points at another (spending at its category).
    exportAll() {
      const all = (sql) => db.prepare(sql).all();
      return {
        settings: Object.fromEntries(all('SELECT key, value FROM settings ORDER BY key').map((r) => [r.key, JSON.parse(r.value)])),
        units: all('SELECT code, name, term, credit, target FROM units ORDER BY code'),
        assessments: all('SELECT unit_code AS unitCode, name, weight, score, max, hurdle FROM assessments ORDER BY unit_code, id'),
        results: all('SELECT code, name, credit, mark, grade, term FROM results ORDER BY id'),
        categories: all('SELECT id, name, monthly_limit AS "limit" FROM budget_categories ORDER BY id'),
        transactions: all('SELECT category_id AS categoryId, what, amount, spent_on AS date FROM transactions ORDER BY spent_on, id'),
        foods: all('SELECT name, kcal, protein FROM foods ORDER BY name'),
        foodLog: all('SELECT eaten_on AS date, meal, food, kcal, protein FROM food_log ORDER BY eaten_on, id'),
        healthDays: all('SELECT day, steps, sleep_minutes AS sleepMinutes, resting_hr AS restingHr FROM health_days ORDER BY day'),
        workouts: all('SELECT done_on AS date, name, notes FROM workouts ORDER BY done_on, id')
      };
    },

    // Puts back what exportAll gave. The data must already be checked. Categories get new ids,
    // and each spending entry is pointed at its category's new id.
    importAll(data) {
      for (const [key, value] of Object.entries(data.settings)) this.setSetting(key, value);
      for (const u of data.units) {
        this.insertUnit(u);
        if (u.target !== null) this.updateUnit(u.code, { target: u.target });
      }
      for (const a of data.assessments) this.insertAssessment(a);
      for (const r of data.results) this.insertResult(r);
      const newId = new Map();
      for (const c of data.categories) newId.set(c.id, this.insertCategory(c));
      for (const t of data.transactions) this.insertTransaction({ ...t, categoryId: newId.get(t.categoryId) });
      for (const f of data.foods) this.insertFood(f);
      for (const e of data.foodLog) this.insertFoodLog(e);
      for (const d of data.healthDays) this.saveHealthDay(d.day, d);
      for (const w of data.workouts) this.insertWorkout(w);
    },
    isEmpty() {
      const tables = ['units', 'results', 'transactions', 'food_log', 'health_days', 'workouts'];
      return tables.every((table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n === 0);
    },
    // Deletes every row the user has entered. The user asked for this; there is no undo.
    wipe() {
      for (const table of ['assessments', 'units', 'results', 'transactions', 'budget_categories', 'food_log', 'foods', 'health_days', 'workouts', 'settings']) {
        db.exec(`DELETE FROM ${table}`);
      }
    }
  };
}
