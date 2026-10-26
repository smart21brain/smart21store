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

4. Play Store redesign (public/smart21store.html, also copied to root)
   - Play-style layout: pill search with suggestions, For you / Top charts / Categories, bottom nav (mobile) and left menu (desktop), featured banners, shelves, list rows, full details page.
   - ElectroLab look mixed in: green-black surfaces and green/gold palette, Poppins headings, gold-ring logo with gold "Store" wordmark, pill tabs with green glow, gold paid/Featured buttons.
   - ElectroLab home content: greeting hero with stat chips and gold-ring logo, "Your progress" rings, "Continue" shortcuts, Achievements grid.
   - Review text and item names are now HTML-escaped. Theme follows the device until the user picks one.
   - Admin, API, Sync, Bundles, Orders, Plus pages keep their logic and use the new colors.
