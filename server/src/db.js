const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/cards.db');

// ensure data dir exists
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

// --- Create tables ---

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    timezone   TEXT NOT NULL DEFAULT 'UTC',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cards (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    last4           TEXT,
    limit_amt       REAL DEFAULT 0,
    balance         REAL DEFAULT 0,
    current_bal     REAL DEFAULT 0,
    rate            REAL DEFAULT 0,
    statement_date  TEXT,
    due_date        TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id            TEXT PRIMARY KEY,
    card_id       TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    user_id       TEXT NOT NULL REFERENCES users(id),
    type          TEXT NOT NULL,
    amount        REAL NOT NULL,
    balance_after REAL NOT NULL,
    note          TEXT,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON transactions(card_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS email_logs (
    id      TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    card_id TEXT REFERENCES cards(id) ON DELETE SET NULL,
    sent_at TEXT DEFAULT (datetime('now')),
    status  TEXT NOT NULL,
    error   TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS payoff_plans (
    id              TEXT PRIMARY KEY,
    card_id         TEXT NOT NULL UNIQUE REFERENCES cards(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL REFERENCES users(id),
    monthly_payment REAL NOT NULL,
    start_date      TEXT NOT NULL,
    start_balance   REAL NOT NULL,
    rate            REAL NOT NULL,
    created_at      TEXT DEFAULT (datetime('now'))
  );
`);

// --- Migrate cards table (idempotent: ignore if column already exists) ---

const cardMigrations = [
  `ALTER TABLE cards ADD COLUMN user_id         TEXT REFERENCES users(id)`,
  `ALTER TABLE cards ADD COLUMN minimum_payment REAL DEFAULT 0`,
  `ALTER TABLE cards ADD COLUMN is_active       INTEGER DEFAULT 1`,
];

for (const sql of cardMigrations) {
  try { db.exec(sql); } catch (err) {
    if (!err.message.includes('duplicate column name')) throw err;
  }
}

// --- Seed default user ---

db.prepare(`
  INSERT INTO users (id, name, email, timezone) VALUES (?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email, timezone=excluded.timezone
`).run(DEFAULT_USER_ID, 'Artem', 'artem.batog@gmail.com', 'America/Vancouver');

// --- Backfill existing cards ---

db.prepare(`
  UPDATE cards SET user_id = ?, is_active = 1 WHERE user_id IS NULL
`).run(DEFAULT_USER_ID);

module.exports = db;
module.exports.DEFAULT_USER_ID = DEFAULT_USER_ID;
