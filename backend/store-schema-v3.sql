-- Run ONCE after v2.
ALTER TABLE store_items ADD COLUMN ships_on TEXT;
CREATE TABLE IF NOT EXISTS store_push_subs(user_id INTEGER,endpoint TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS store_sub_seats(sub_id INTEGER,user_id INTEGER,PRIMARY KEY(sub_id,user_id));
CREATE TABLE IF NOT EXISTS store_family(parent_id INTEGER,child_id INTEGER,status TEXT DEFAULT 'pending',PRIMARY KEY(parent_id,child_id));
CREATE TABLE IF NOT EXISTS store_progress(user_id INTEGER,item_id INTEGER,pct INTEGER,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,item_id));
CREATE TABLE IF NOT EXISTS store_api_keys(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,key_hash TEXT UNIQUE,name TEXT,calls INTEGER DEFAULT 0,revoked INTEGER DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS store_rate(key_id INTEGER,minute INTEGER,n INTEGER,PRIMARY KEY(key_id,minute));
CREATE TABLE IF NOT EXISTS store_searches(q TEXT PRIMARY KEY,n INTEGER);
CREATE TABLE IF NOT EXISTS store_events(day TEXT,type TEXT,n INTEGER,PRIMARY KEY(day,type));
CREATE TABLE IF NOT EXISTS store_samples(item_id INTEGER PRIMARY KEY,r2_key TEXT,type TEXT);
INSERT OR IGNORE INTO store_items(id,kind,name,description,price_tzs,status) VALUES(9003,'Plan','Smart21 School Plan Yearly','Per seat, 365 days',90000,'published');
