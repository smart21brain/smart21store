-- Run ONCE after v4:
--   npx wrangler d1 execute <your-db> --remote --file=backend/store-schema-v5.sql
ALTER TABLE store_orders ADD COLUMN gift_msg TEXT;
ALTER TABLE store_reviews ADD COLUMN reply TEXT;
ALTER TABLE store_reviews ADD COLUMN reply_at TEXT;
CREATE TABLE IF NOT EXISTS store_review_votes(review_id INTEGER,user_id INTEGER,PRIMARY KEY(review_id,user_id));
CREATE TABLE IF NOT EXISTS store_watch(user_id INTEGER,item_id INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,item_id));
CREATE TABLE IF NOT EXISTS store_classes(id INTEGER PRIMARY KEY AUTOINCREMENT,teacher_id INTEGER NOT NULL,name TEXT NOT NULL,code TEXT UNIQUE NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS store_class_members(class_id INTEGER,user_id INTEGER,joined_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(class_id,user_id));
CREATE TABLE IF NOT EXISTS store_class_items(class_id INTEGER,item_id INTEGER,pushed_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(class_id,item_id));
CREATE TABLE IF NOT EXISTS store_lists(code TEXT PRIMARY KEY,user_id INTEGER UNIQUE,title TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS store_points_log(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,reason TEXT,ref TEXT,pts INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,reason,ref));
CREATE TABLE IF NOT EXISTS store_points_state(user_id INTEGER PRIMARY KEY,last_day TEXT,streak INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS store_item_views(item_id INTEGER,day TEXT,n INTEGER DEFAULT 0,PRIMARY KEY(item_id,day));
CREATE TABLE IF NOT EXISTS store_search_hits(item_id INTEGER,q TEXT,n INTEGER DEFAULT 0,PRIMARY KEY(item_id,q));
