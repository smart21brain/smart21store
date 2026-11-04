-- Run ONCE after v5: one item can now have a separate download per device (Android APK, Windows, Mac, Linux).
CREATE TABLE IF NOT EXISTS store_platform_files(item_id INTEGER,platform TEXT,r2_key TEXT,size_bytes INTEGER DEFAULT 0,filename TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(item_id,platform));
