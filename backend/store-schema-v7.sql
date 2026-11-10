-- Run ONCE after v6: failed sign-in / sign-up attempt log (brute-force protection).
CREATE TABLE IF NOT EXISTS store_auth_attempts(id INTEGER PRIMARY KEY AUTOINCREMENT,k TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_auth_attempts_k ON store_auth_attempts(k,created_at);
