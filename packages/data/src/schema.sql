-- Local SQLite schema for the Lite edition (offline).
-- In production the file is encrypted at rest (SQLCipher / Tauri SQL plugin).

CREATE TABLE IF NOT EXISTS credential (
  id            TEXT PRIMARY KEY,
  profession    TEXT NOT NULL,
  state         TEXT NOT NULL,
  pathway       TEXT NOT NULL,
  requirement_set_id TEXT NOT NULL,
  start_date    TEXT,
  renewal_date  TEXT
);

CREATE TABLE IF NOT EXISTS practice_entry (
  id            TEXT PRIMARY KEY,
  credential_id TEXT,
  date          TEXT NOT NULL,
  total_hours   REAL NOT NULL,
  direct_contact_hours REAL DEFAULT 0,
  relational_hours     REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS supervision_entry (
  id            TEXT PRIMARY KEY,
  credential_id TEXT,
  date          TEXT NOT NULL,
  duration_hours REAL NOT NULL,
  format        TEXT NOT NULL,   -- individual | group
  setting       TEXT NOT NULL,   -- in_person | remote
  supervisor_id TEXT,
  signed_off    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ceu_entry (
  id            TEXT PRIMARY KEY,
  credential_id TEXT,
  date          TEXT NOT NULL,
  hours         REAL NOT NULL,
  category      TEXT NOT NULL,
  title         TEXT,
  provider      TEXT
);
