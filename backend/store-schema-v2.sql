-- Run ONCE after store-schema.sql (ALTER TABLE cannot be re-run).
ALTER TABLE store_items ADD COLUMN license TEXT DEFAULT 'single';
ALTER TABLE store_items ADD COLUMN stock INTEGER;
ALTER TABLE store_sellers ADD COLUMN verified INTEGER DEFAULT 0;
ALTER TABLE store_orders ADD COLUMN delivery TEXT;
ALTER TABLE store_orders ADD COLUMN pickup TEXT;
ALTER TABLE store_orders ADD COLUMN gift_email TEXT;
ALTER TABLE store_orders ADD COLUMN ship TEXT DEFAULT 'received';
CREATE TABLE IF NOT EXISTS store_refunds(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER UNIQUE,user_id INTEGER,reason TEXT,status TEXT DEFAULT 'requested',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS store_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,action TEXT,detail TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
