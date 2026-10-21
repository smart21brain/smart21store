PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('3cffc30f3067aecd01e67efa9f60f6f4a375df2a9c07a58995228c539f455d8c',2,'2026-10-01T18:49:16.680Z','2026-09-01 18:49:16');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('afa5b1f8cd96f3d852c95245bb1bf56ae6951523ca87865a5abe207c7878badc',2,'2026-10-01T18:49:42.212Z','2026-09-01 18:49:42');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('1cc42093cb612ac7cc24de97ffcc2a3dcb180815869acc8f434f48037721149a',2,'2026-10-01T19:10:06.968Z','2026-09-01 19:10:07');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('ebe36dde39128e1f76de6e5a89ee0f18a3a67539502baa9564730b872ec27db7',2,'2026-10-02T13:14:16.414Z','2026-09-02 13:14:16');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('ad94a54eb08b3f00bcc761429c5ab8f55d150269c7ea54e16e955b1118da03d7',2,'2026-10-02T14:42:51.609Z','2026-09-02 14:42:51');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('40ecf7d7914221f81181f2af769ed10ad796d19f4cf02608fe35a19776638748',2,'2026-10-03T05:55:34.012Z','2026-09-03 05:55:34');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('4b52a466086c32f645e0e2aad091417e58164ce6d53c33946246ed32fbdb1ff6',6,'2026-10-03T06:06:25.769Z','2026-09-03 06:06:25');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('c52518d8e7bf92f2ba7b900e062a2cccc53f67ad567b19b5c72468af28ab0b7c',10,'2026-10-16T13:40:23.513Z','2026-09-16 13:40:23');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('a291851f531eed086f71cc380523cdb33c50b29cd4f64ebd98f5183d07bc63a3',10,'2026-10-17T13:07:29.235Z','2026-09-17 13:07:29');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('1ae08eca5f52a04de85ead600e9b844eb81013356ca47ae4c2b394f8e2b9944d',10,'2026-10-17T15:50:42.657Z','2026-09-17 15:50:42');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('2b5d8164ea8d1def9110361b2a7aca6083b0726040fa8236ba290e77a1d3118b',10,'2026-10-17T18:09:40.747Z','2026-09-17 18:09:40');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('23dfd03c48cc474e0bc81587d97befe1982076fb6a15c52e741608fcb1887267',6,'2026-10-20T20:03:27.386Z','2026-09-20 20:03:27');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('4444884c26863a7f01420774199e2bc1c4ecc979d4cdb60de72d4cc5ec98e718',10,'2026-10-22T16:54:05.993Z','2026-09-22 16:54:06');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('aaaf105584ba7bd90092ad0bed79de0f728e90f6f2e1c54686b536fd4464375b',10,'2026-10-23T19:07:31.286Z','2026-09-23 19:07:31');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('9ad691417dde8e5b0895e003f5bb816101c12496e1014a902dd7284319dbcd41',10,'2026-10-24T09:31:23.391Z','2026-09-24 09:31:23');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('3bec24d61411b64cc9e8adbbbed7e83d0e44eb4f3706f88d49b3f5a3dd063cc2',10,'2026-10-24T09:31:25.881Z','2026-09-24 09:31:25');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('585e1d8b1d2194dcdc0d082a9f92012ad44dc1d8f287020329c4dc7cf6e77fc9',10,'2026-10-24T17:41:06.905Z','2026-09-24 17:41:07');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('5b1354d345db94ae2d9ca29d7b93b267b92b7fc57c55370796446079799d00a3',2,'2026-10-24T20:17:01.428Z','2026-09-24 20:17:01');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('e247a1c3522660e38ba4cb6cc9cc27c38b449628ea34d278bb2fc170a61bd1c9',16,'2026-10-24T20:41:02.166Z','2026-09-24 20:41:02');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('c60b3da2159c5ba4e4e0a6a2518e05cfd4e4039cf31e71e2cac30d210ae4d901',16,'2026-10-25T05:57:02.863Z','2026-09-25 05:57:02');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('0821b30f8c9b722781bbdd32023d1ce73d619d8cbb7eaa3e7b3643052af2f236',16,'2026-10-28T04:51:43.064Z','2026-09-28 04:51:43');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('ecc025f611ad84ec3c9181a4dc8f2a0b99ccaf6dbad414e31f1b3554d363732d',16,'2026-10-30T19:10:42.467Z','2026-09-30 19:10:42');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('2d4e0b24589df250f76f2f47961348b5f86fb1a7e7ad9ed82a77ec685fd3be81',16,'2026-11-01T14:46:11.548Z','2026-10-02 14:46:11');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('3344fe3d4226536accfcf888937fc2e29b583cbd2bf6969b0fcbb14b8c1b7da2',19,'2026-11-01T17:51:03.677Z','2026-10-02 17:51:03');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('7336db8357b214d58d18a0fc1b53ff75847791a00f5160d5809449827be25a9a',20,'2026-11-01T18:23:57.620Z','2026-10-02 18:23:57');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('f7e6468394475ee9afbedecb3013ea29eaf4013d5a90d884667aad9dfac46436',20,'2026-11-01T18:25:01.961Z','2026-10-02 18:25:02');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('538dc5252f4a731f1ecbc283600b0f5c51ee2d0d816fc7077b94810d6a388423',16,'2026-11-03T14:51:32.427Z','2026-10-04 14:51:32');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('b2bcd27a78ccd73ecdfbbe352c75efef66d9fe60b36410189695588cd070c5d3',23,'2026-11-09T19:05:29.071Z','2026-10-10 19:05:29');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('edf0d11ae8e8e2a01a98b43ad4814fda3d1e7b3d0e8e25c1ae56dc4b49571a48',23,'2026-11-09T19:29:58.294Z','2026-10-10 19:29:58');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('3ca3682529c2a4a10ba656e8b12f240e468953995c206bc06ee1851a2a1d9f0a',21,'2026-11-09T20:08:33.598Z','2026-10-10 20:08:33');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('6e928b4c9dce0f2fcc2cc7b84d472f22c6b429ad19821421084c856dd17b7ad1',10,'2026-11-18T17:08:20.149Z','2026-10-19 17:08:20');
INSERT INTO "sessions" ("token","user_id","expires_at","created_at") VALUES('a65f1dee70ae4b7bdd2c867c34c8d18fc00fd369574643c8e93accd48a1d493e',10,'2026-11-20T06:08:18.556Z','2026-10-21 06:08:18');
