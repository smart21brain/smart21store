PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',   -- 'user' | 'admin'
  avatar_key    TEXT,                            -- R2 object key
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "users" ("id","name","email","password_hash","password_salt","role","avatar_key","created_at") VALUES(1,'Admin','admin@smart21brain.com','b56a2e29ab00f457df5a6bfa39ceab37802761f92b4d17db54412e77ec697c5','6950776b6072e0f12528aa7dd22ab261','admin',NULL,'2026-09-01 18:39:02');
INSERT INTO "users" ("id","name","email","password_hash","password_salt","role","avatar_key","created_at") VALUES(2,'amran kisaga','amrankisaga903@gmail.com','b305e261129797a6bc06208af6cbc25db95dc17198275271267bf52bbdc6a07b','2fae23ab3fd525efca389f1c73ab924d','user',NULL,'2026-09-01 18:49:16');
INSERT INTO "users" ("id","name","email","password_hash","password_salt","role","avatar_key","created_at") VALUES(6,'Amran K','nexpstech@gmail.com','940f5ef1ea414d1b113d4a0617c0dce31fb66493344773418f476b867aa18f77','75db20a018129a6591879b35ef4f1b4d','user','avatars/6-0a12b671-59c5-48d3-83fd-46243ff35458.png','2026-09-03 05:56:32');
INSERT INTO "users" ("id","name","email","password_hash","password_salt","role","avatar_key","created_at") VALUES(8,'yohana Samwel','mihayos2026@gmail.com','945d01c6ded34634b49e08309a4f99905e88b25991f4b0e3d3313aacd6763af5','f4fdddc50f5202af0e8781ba38376f0b','user','avatars/8-d9061513-3bf6-4362-a1ff-8afeef2f9370.png','2026-09-07 06:59:32');
INSERT INTO "users" ("id","name","email","password_hash","password_salt","role","avatar_key","created_at") VALUES(10,'Amran Kisaga','smart21brain@gmail.com','6f03857c079f19da5e198b9d253acc5fafad08dc599dcfa42e62dcc70392d1fa','d53bf86371fd33bd1f01a1f79280cd13','admin','avatars/10-53c42d18-45ab-40fd-9435-99e9fbe9a557.png','2026-09-08 19:03:39');
INSERT INTO "users" ("id","name","email","password_hash","password_salt","role","avatar_key","created_at") VALUES(13,'ramadhan haule','smart221brain@gmail.com','a5d593ab4a196b9ae4adb5ab73215cd2871ef8fbbe0a8fcad6a9ef6f2201e820','765dec41f4a9b3659282fd54d9bff43f','user','avatars/13-e0c848f8-6af7-49b2-ac33-787ecfff5252.png','2026-09-14 17:12:55');
INSERT INTO "users" ("id","name","email","password_hash","password_salt","role","avatar_key","created_at") VALUES(14,'saidi','uhuruprimary@gmail.com','39f558cc375dd2c70637811f31e7b3e1ecd2151b18d220e63ecd4777bd9602cf','409e96fa645b28a0d23472bb69129224','user',NULL,'2026-09-22 17:12:04');
INSERT INTO "users" ("id","name","email","password_hash","password_salt","role","avatar_key","created_at") VALUES(15,'Amani','sds@gmail.com','3bc85e7698438639860976053929468655c3ef2bd2012ddedbe95fe4e9bc3522','c8fac59eae7fbe6bb2a5d3af36c0538f','user',NULL,'2026-09-22 20:11:04');
INSERT INTO "users" ("id","name","email","password_hash","password_salt","role","avatar_key","created_at") VALUES(16,'Chopa','chopa21@gmail.com','6e0123e7c0966a21cc874b0a8bc97ddbef5e24258f9df5062adfac51c85ef701','dd093563d97c4d5028d974d4c4545d61','user','avatars/16-1ae98033-abca-480a-9aa0-ca4ed44cb884.webp','2026-09-24 17:42:59');
INSERT INTO "users" ("id","name","email","password_hash","password_salt","role","avatar_key","created_at") VALUES(19,'saidi kinanda','tuishitenaf@gmail.com','b1bb50795a1b260c1e6ec20b314a6fe7ababd7e517fc15cec8d684ee7c97b918','b1f30f85eac6ac2e9484be58405ef80a','user',NULL,'2026-10-02 17:51:03');
INSERT INTO "users" ("id","name","email","password_hash","password_salt","role","avatar_key","created_at") VALUES(20,'Amran Kisaga','uhuru@gmail.com','cda3620667d32730360d8d477e97708ed0015a4bdef61fba26fa5dddd25429dd','2e05a56dd6a78f59c8fa0301e15e3ec6','user','avatars/20-57c45711-d65e-4127-8881-8ecc8d87cc80.png','2026-10-02 18:23:55');
INSERT INTO "users" ("id","name","email","password_hash","password_salt","role","avatar_key","created_at") VALUES(21,'Sechu','sechu@gmail.com','a93d61c59f30ba676e527cc6f3c63fa9f6e7aa209d4204d35dcdfbea4a782678','ba63933a47becfb2aa630d40c7f7e612','teacher','avatars/21-a18809bf-a3df-45f6-aedf-aedf6c7a05bf.jpg','2026-10-09 17:46:00');
INSERT INTO "users" ("id","name","email","password_hash","password_salt","role","avatar_key","created_at") VALUES(22,'jonathan','smart1brain@gmail.com','6ee67453450701336e5385c36e0f981b529a60b332e27e08e22a004f821ce18e','e1fb91a670abc78a879b38d6bea0a390','user',NULL,'2026-10-10 19:04:26');
INSERT INTO "users" ("id","name","email","password_hash","password_salt","role","avatar_key","created_at") VALUES(23,'amran kisaga','smarbrain@gmail.com','e10a6d72ce1f8dc87099d8d04df9eb9442e0ae2c9b798cb104bfb0650a27553d','35faf90e3984fe0cc89055e6e35cf714','teacher',NULL,'2026-10-10 19:05:28');
