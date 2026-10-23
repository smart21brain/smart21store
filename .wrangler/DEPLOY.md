# Smart21Store - full package (Worker: smart21store, D1: smart21store-db, R2: smart21store-files)

Everything is in this one folder. Open a terminal INSIDE this folder (where wrangler.toml is) for every command.

1. npx wrangler login
2. npx wrangler d1 create smart21store-db        -> copy the database_id into wrangler.toml
   npx wrangler r2 bucket create smart21store-files
3. Copy lib/auth.js from your Smart21Brain project into src/lib/auth.js
4. Create tables (once each, in order):
   npx wrangler d1 execute smart21store-db --remote --file=backend/store-schema.sql
   npx wrangler d1 execute smart21store-db --remote --file=backend/store-schema-v2.sql
   npx wrangler d1 execute smart21store-db --remote --file=backend/store-schema-v3.sql
5. Accounts (users + sessions tables) - see README of the earlier message, then:
   npx wrangler d1 execute smart21store-db --remote --file=users.sql
6. Secrets: npx wrangler secret put STORE_SECRET  (also PAY_API_URL, PAY_API_KEY, PAY_WEBHOOK_SECRET, SCAN_SECRET)
7. Deploy: npx wrangler deploy
8. Sample files (37 files):
   upload-samples.bat                      (uploads files to R2)
   npx wrangler d1 execute smart21store-db --remote --file=backend/seed-all-samples.sql
9. Open https://smart21store.YOUR-NAME.workers.dev/   and /api/store/items
