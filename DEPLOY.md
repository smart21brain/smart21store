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
8. No sample data is included any more. Add your real items from the Admin tab (see REAL-DATA.md).
9. Open https://smart21store.YOUR-NAME.workers.dev/   and /api/store/items


## v4 update (icons, picks, coupons, seller stats)
1. `npx wrangler d1 execute <your-db> --remote --file=backend/store-schema-v4.sql`  (run ONCE)
2. `npx wrangler deploy`
3. Hard-refresh the store once (service worker cache is now `s21store-v2`).
4. Open Studio (rail > Studio) as admin to mark Featured / Editors' choice, upload icons and create coupons.
5. Optional: set `window.S21_ELECTROLAB='https://your-electrolab-url/'` before the store script to point the "Open in ElectroLab" button. The button opens `<url>#store=<item id>`; ElectroLab needs a small handler that reads that hash and downloads the item.


## v5 update
1. npx wrangler d1 execute <your-db> --remote --file=backend/store-schema-v5.sql   (run ONCE, after v4)
2. npx wrangler deploy
3. Hard-refresh once (service worker cache is s21store-v2).
Notes:
- Classes: only users whose account role is teacher (or admin) can create classes. A file can be pushed to a class if it is free, the teacher published it, or the teacher owns it with a Classroom / School license.
- Rewards are computed from your existing data (library, reviews, referral uses) and are safe to re-sync; redeeming creates a one-time coupon valid 30 days.
- Downloads use HTTP Range requests against /api/store/file. They resume after a dropped connection while the app is open; browsers do not allow fully closed-app background downloads in a web app.
- Trending searches need the existing search logging (store_searches). Per-item views and search words start counting after this update.


## v7 update (register + login)
1. `npx wrangler d1 execute smart21store-db --remote --file=backend/store-schema-v7.sql`  (run ONCE)
2. `npx wrangler deploy`
- New `POST /api/store/register` (name, email, password: 8+ chars with a letter and a number). New accounts are always role `user`; an admin grants teacher/seller access.
- Login and register are limited to 8 failed attempts per email+IP per 15 minutes. Register signs the user in immediately.
- The store's Sign in popup now has Sign in / Create account tabs; `/login.html` has them too (`/login.html#register` opens the sign-up tab).


## Google sign-in
1. Google Cloud Console > APIs & Services > Credentials > Create credentials > OAuth client ID > Web application.
2. Under "Authorized JavaScript origins" add your store address (e.g. https://smart21store.smart21brain.com and your workers.dev address). No redirect URI is needed.
3. Copy the Client ID into wrangler.toml: `GOOGLE_CLIENT_ID = "....apps.googleusercontent.com"` (under [vars]), then `npx wrangler deploy`.
- The "Continue with Google" button appears automatically once GOOGLE_CLIENT_ID is set; without it nothing changes.
- A Google user whose verified email matches an existing account signs into that account; otherwise a new `user` account is created.


## One sign-in for Smart21Brain + the store
Both apps use the same D1 `users` + `sessions` tables, so they only need to share the session cookie.
1. `COOKIE_DOMAIN = ".smart21brain.com"` is now set in this wrangler.toml. `npx wrangler deploy`.
2. In the Smart21Brain project: copy this `src/lib/auth.js` over its own, add the same `COOKIE_DOMAIN` under [vars], and pass it where Brain sets/clears the cookie:
   `sessionCookie(token, expires, env.COOKIE_DOMAIN)` and `clearSessionCookie(env.COOKIE_DOMAIN)` (call clearSessionCookie twice on logout, once without the domain, to remove any old cookie). Brain's session lookup should use `getSessionUser` from the same file.
3. Both sites must be on https and on subdomains of smart21brain.com. Users who signed in before the change simply sign in once more.
- Signing in or out on either site now signs in or out on both. Google sign-in and registration here also sign the user into Brain.
