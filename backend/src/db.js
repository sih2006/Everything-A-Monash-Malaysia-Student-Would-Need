// Opens the database and makes sure its tables exist.
//
// SQLite is used because it is one file on disk, needs no server and no account,
// and comes with Node. Nothing outside this file and store.js knows that the
// data lives in SQLite, so it can be swapped for a cloud database later.

import { DatabaseSync } from 'node:sqlite';

// Each entry is one step. A step is only ever added, never changed, so a
// database made by an older version can be brought up to date.
const MIGRATIONS = [
  `
  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE units (
    code       TEXT PRIMARY KEY,
    name       TEXT NOT NULL DEFAULT '',
    term       TEXT NOT NULL DEFAULT '',
    credit     REAL NOT NULL DEFAULT 6,
    target     REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE assessments (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_code TEXT NOT NULL REFERENCES units(code) ON DELETE CASCADE ON UPDATE CASCADE,
    name      TEXT NOT NULL,
    weight    REAL NOT NULL,
    score     REAL,
    max       REAL NOT NULL DEFAULT 100,
    hurdle    REAL
  );
  CREATE INDEX assessments_by_unit ON assessments(unit_code, id);

  CREATE TABLE results (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    code       TEXT NOT NULL,
    name       TEXT NOT NULL DEFAULT '',
    credit     REAL NOT NULL DEFAULT 6,
    mark       REAL NOT NULL,
    grade      TEXT,
    term       TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE budget_categories (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL UNIQUE,
    monthly_limit REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
    what        TEXT NOT NULL,
    amount      REAL NOT NULL,
    spent_on    TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX transactions_by_day ON transactions(spent_on);

  CREATE TABLE foods (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name    TEXT NOT NULL UNIQUE,
    kcal    REAL NOT NULL,
    protein REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE food_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    eaten_on   TEXT NOT NULL,
    meal       TEXT NOT NULL DEFAULT 'Snack',
    food       TEXT NOT NULL,
    kcal       REAL NOT NULL,
    protein    REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX food_log_by_day ON food_log(eaten_on);

  CREATE TABLE health_days (
    day           TEXT PRIMARY KEY,
    steps         INTEGER,
    sleep_minutes INTEGER,
    resting_hr    INTEGER
  );

  CREATE TABLE workouts (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    done_on TEXT NOT NULL,
    name    TEXT NOT NULL,
    notes   TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX workouts_by_day ON workouts(done_on);
  `
];

// Opens the database at `path`. Use ':memory:' for a database that lives only while the program runs.
export function openDatabase(path) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL');   // safer if the program is stopped mid-write

  const version = db.prepare('PRAGMA user_version').get().user_version;
  for (let step = version; step < MIGRATIONS.length; step++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[step]);
      db.exec(`PRAGMA user_version = ${step + 1}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  return db;
}

// Runs `work` so that either all of its changes are kept or none are.
export function inTransaction(db, work) {
  db.exec('BEGIN');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
