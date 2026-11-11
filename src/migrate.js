// Self-healing database upgrade. Runs once per Worker instance before the first /api/ request.
// It adds any column / table from backend/store-schema-v2..v8.sql that your D1 database is still missing,
// so "no such column: has_icon" (or has_banner, editors, license ...) can never happen again.
// Safe to run any number of times: it only adds what is missing and never touches existing data.
const COLS = {
  store_items: [
    ['license', "TEXT DEFAULT 'single'"], ['stock', 'INTEGER'], ['ships_on', 'TEXT'],
    ['has_icon', 'INTEGER DEFAULT 0'], ['editors', 'INTEGER DEFAULT 0'],
    ['has_banner', 'INTEGER DEFAULT 0'], ['has_trailer', 'INTEGER DEFAULT 0'], ['trailer_url', 'TEXT'],
  ],
  store_sellers: [['verified', 'INTEGER DEFAULT 0']],
  store_orders: [
    ['delivery', 'TEXT'], ['pickup', 'TEXT'], ['gift_email', 'TEXT'], ['ship', "TEXT DEFAULT 'received'"], ['gift_msg', 'TEXT'],
  ],
  store_reviews: [['reply', 'TEXT'], ['reply_at', 'TEXT']],
};
const TABLES = [
  "CREATE TABLE IF NOT EXISTS store_refunds(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER UNIQUE,user_id INTEGER,reason TEXT,status TEXT DEFAULT 'requested',created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS store_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,action TEXT,detail TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS store_push_subs(user_id INTEGER,endpoint TEXT PRIMARY KEY)",
  "CREATE TABLE IF NOT EXISTS store_sub_seats(sub_id INTEGER,user_id INTEGER,PRIMARY KEY(sub_id,user_id))",
  "CREATE TABLE IF NOT EXISTS store_family(parent_id INTEGER,child_id INTEGER,status TEXT DEFAULT 'pending',PRIMARY KEY(parent_id,child_id))",
  "CREATE TABLE IF NOT EXISTS store_progress(user_id INTEGER,item_id INTEGER,pct INTEGER,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,item_id))",
  "CREATE TABLE IF NOT EXISTS store_api_keys(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,key_hash TEXT UNIQUE,name TEXT,calls INTEGER DEFAULT 0,revoked INTEGER DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS store_rate(key_id INTEGER,minute INTEGER,n INTEGER,PRIMARY KEY(key_id,minute))",
  "CREATE TABLE IF NOT EXISTS store_searches(q TEXT PRIMARY KEY,n INTEGER)",
  "CREATE TABLE IF NOT EXISTS store_events(day TEXT,type TEXT,n INTEGER,PRIMARY KEY(day,type))",
  "CREATE TABLE IF NOT EXISTS store_samples(item_id INTEGER PRIMARY KEY,r2_key TEXT,type TEXT)",
  "CREATE TABLE IF NOT EXISTS store_review_votes(review_id INTEGER,user_id INTEGER,PRIMARY KEY(review_id,user_id))",
  "CREATE TABLE IF NOT EXISTS store_watch(user_id INTEGER,item_id INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,item_id))",
  "CREATE TABLE IF NOT EXISTS store_classes(id INTEGER PRIMARY KEY AUTOINCREMENT,teacher_id INTEGER NOT NULL,name TEXT NOT NULL,code TEXT UNIQUE NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS store_class_members(class_id INTEGER,user_id INTEGER,joined_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(class_id,user_id))",
  "CREATE TABLE IF NOT EXISTS store_class_items(class_id INTEGER,item_id INTEGER,pushed_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(class_id,item_id))",
  "CREATE TABLE IF NOT EXISTS store_lists(code TEXT PRIMARY KEY,user_id INTEGER UNIQUE,title TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS store_points_log(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,reason TEXT,ref TEXT,pts INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,reason,ref))",
  "CREATE TABLE IF NOT EXISTS store_points_state(user_id INTEGER PRIMARY KEY,last_day TEXT,streak INTEGER DEFAULT 0)",
  "CREATE TABLE IF NOT EXISTS store_item_views(item_id INTEGER,day TEXT,n INTEGER DEFAULT 0,PRIMARY KEY(item_id,day))",
  "CREATE TABLE IF NOT EXISTS store_search_hits(item_id INTEGER,q TEXT,n INTEGER DEFAULT 0,PRIMARY KEY(item_id,q))",
  "CREATE TABLE IF NOT EXISTS store_platform_files(item_id INTEGER,platform TEXT,r2_key TEXT,size_bytes INTEGER DEFAULT 0,filename TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(item_id,platform))",
  "CREATE TABLE IF NOT EXISTS store_auth_attempts(id INTEGER PRIMARY KEY AUTOINCREMENT,k TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT (datetime('now')))",
  "CREATE INDEX IF NOT EXISTS idx_auth_attempts_k ON store_auth_attempts(k,created_at)",
];
let done = null;
export function ensureSchema(env) {
  if (!done) done = run(env).catch(e => { console.error('migrate', e && e.message); done = null; });
  return done;
}
async function run(env) {
  const db = env.DB;
  for (const sql of TABLES) { try { await db.prepare(sql).run(); } catch (e) { console.error('migrate table', e && e.message); } }
  for (const [table, cols] of Object.entries(COLS)) {
    let have;
    try { have = new Set((await db.prepare(`PRAGMA table_info(${table})`).all()).results.map(r => r.name)); } catch (e) { continue; }
    if (!have.size) continue; // table does not exist yet
    for (const [name, def] of cols) {
      if (have.has(name)) continue;
      try { await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`).run(); } catch (e) { console.error('migrate col', table, name, e && e.message); }
    }
  }
}
