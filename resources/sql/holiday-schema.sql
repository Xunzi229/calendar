PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS holiday_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'manual',
  source_url TEXT,
  memo TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_holiday_groups_year
  ON holiday_groups (year);

CREATE TABLE IF NOT EXISTS holiday_days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('holiday', 'workday', 'festival')),
  source TEXT NOT NULL DEFAULT 'manual',
  source_url TEXT,
  group_id INTEGER,
  is_manual_override INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES holiday_groups (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_holiday_days_year_month
  ON holiday_days (year, month);

CREATE INDEX IF NOT EXISTS idx_holiday_days_kind
  ON holiday_days (kind);

CREATE TABLE IF NOT EXISTS holiday_sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  message TEXT,
  synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_holiday_sync_logs_year
  ON holiday_sync_logs (year);
