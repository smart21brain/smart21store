# Deploy Smart21Store (Worker: smart21store, D1: smart21store-db)

1. cd into this folder, then log in:  npx wrangler login
2. Create the database and file bucket:
   npx wrangler d1 create smart21store-db        # copy database_id into wrangler.toml
   npx wrangler r2 bucket create smart21store-files
3. Copy lib/auth.js from your Smart21Brain project into src/lib/auth.js
   (store-api.js imports getSessionUser from ./lib/auth.js).
4. Accounts: the store reads the users and sessions tables. Copy them into smart21store-db:
   npx wrangler d1 export smart21brain-db --remote --table=users --output=users.sql
   npx wrangler d1 export smart21brain-db --remote --table=sessions --output=sessions.sql
   npx wrangler d1 execute smart21store-db --remote --file=users.sql
   npx wrangler d1 execute smart21store-db --remote --file=sessions.sql
   (use your real sessions table name from auth.js). This is a snapshot: accounts created later
   in Smart21Brain will not exist in the store until you copy again.
5. Create the store tables, in order:
   npx wrangler d1 execute smart21store-db --remote --file=backend/store-schema.sql
   npx wrangler d1 execute smart21store-db --remote --file=backend/store-schema-v2.sql
   npx wrangler d1 execute smart21store-db --remote --file=backend/store-schema-v3.sql
6. Secrets (one command each, you will be prompted for the value):
   npx wrangler secret put STORE_SECRET
   npx wrangler secret put PAY_API_URL
   npx wrangler secret put PAY_API_KEY
   npx wrangler secret put PAY_WEBHOOK_SECRET
   npx wrangler secret put SCAN_SECRET
   Push alerts (optional): node backend/gen-vapid.mjs  and set the three VAPID secrets it prints.
7. Deploy:  npx wrangler deploy
8. Open https://smart21store.<your-subdomain>.workers.dev/smart21store.html
