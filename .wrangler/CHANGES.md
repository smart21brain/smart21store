# Smart21Store - what changed

1. public/smart21store.html
   - Fixed blank tabs (Bundles, Sync, Refer, Paths showed "bun/syn/ref/path" and "undefined"): LANGS was used before it was defined.
   - Original green UI kept.
   - Admin dashboard: new Publish console (drag and drop, File or Application, icon/screenshots, sample, progress bar, status steps) and "Release a new version".
   - Catalog reloads right after an upload, every 60 seconds, and when you return to the tab.
2. src/store-api.js
   - No virus-scan service configured: admin uploads publish immediately, seller uploads go to "review".
   - Scan service configured (SCAN_URL): old flow (scanning, review, Publish).
   - Rejects uploads with no file or title; returns the real status.
3. extras/smart21store-playstore.html - optional Play Store style version (not deployed unless you copy it over public/smart21store.html).

Deploy: copy the files over your project, deploy, then hard-refresh (the service worker may cache the old page).

4. Deploy fix: public/.assetsignore added so a public/sample-files folder is never sent to Workers assets (limit 25 MiB per file). Large files such as the 79 MiB ElectroLab .exe belong in R2, not in public/. The sample-files folder is left out of this zip; keep your own copy outside public/.

5. Sign-in fix (404 on /login.html): the Sign in button went to /login.html, which only exists on your main Smart21Brain site. The store now has its own public/login.html and POST /api/store/login and /api/store/logout in src/store-api.js. They use the same users + sessions tables. The login looks for password_hash/password_salt columns (also pass_hash/pass_salt or hash/salt).
