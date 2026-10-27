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

4. Play Store + ElectroLab redesign (public/smart21store.html, also copied to root)
   - Play layout: pill search with suggestions, For you / Top charts / Categories, bottom nav (mobile), left menu (desktop), featured banners, shelves, list rows, full details page.
   - ElectroLab look: green-black surfaces, gold accents, Poppins, gold-ring logo, pill tabs, greeting hero, progress rings, Continue shortcuts, Achievements.
   - Featured banners use the `featured` flag; "Editors' choice" shelf uses the new `editors` flag. Both are set from Studio.
   - Real review counts (rating_count), What's new + Updated date on each item, real square app icons (upload from Studio).
   - Browse by level (Nursery / Primary / Secondary / University) with age labels, developer pages, More from this seller.
   - Downloads manager, Settings (theme, language, currency, Wi-Fi-only downloads, data saver, push, install), install banner, offline banner + cached items, loading skeletons.
   - Learning path card on items, certificates (download/print) for finished paths, "Open in ElectroLab" button on electronics files.
   - Studio (admin + sellers): sales chart, per-item downloads/sales/income/rating, icon upload, Featured / Editors' toggles, coupons, reported reviews.
   - Backend: GET /api/store/items now returns notes, updated, seller name, flags (and the sample/seller columns that the unfiltered query was missing).
     New: GET /api/store/icon/:id, POST /admin/items/:id/icon, POST /admin/items/:id/pick, GET/POST /admin/coupons, POST /admin/coupons/:code/delete, GET /seller/stats.
     Push alerts now fire for wishlist price drops and for updates to owned items.
   - Run backend/store-schema-v4.sql ONCE before deploying the Worker.
   - Review text and item names are HTML-escaped.

4. Play Store + ElectroLab redesign (public/smart21store.html, also copied to root)
   - Play layout: pill search with suggestions, For you / Top charts / Categories, bottom nav (mobile), left menu (desktop), featured banners, shelves, list rows, full details page.
   - ElectroLab look: green-black surfaces, gold accents, Poppins, gold-ring logo, pill tabs, greeting hero, progress rings, Continue shortcuts, Achievements.
   - Featured banners use the featured flag; Editors choice shelf uses the new editors flag. Both are set from Studio.
   - Real review counts (rating_count), Whats new + Updated date, real square app icons (upload from Studio).
   - Browse by level with age labels, developer pages, More from this seller.
   - Downloads manager, Settings (theme, language, currency, Wi-Fi-only downloads, data saver, push, install), install banner, offline banner + cached items, loading skeletons.
   - Learning path card on items, certificates (download/print) for finished paths, Open in ElectroLab button on electronics files.
   - Studio (admin + sellers): sales chart, per-item stats, icon upload, Featured / Editors toggles, coupons, reported reviews.
   - Backend: GET /api/store/items now returns notes, updated, seller name, flags (and the sample/seller columns the unfiltered query was missing).
     New: GET /api/store/icon/:id, POST /admin/items/:id/icon, POST /admin/items/:id/pick, GET/POST /admin/coupons, POST /admin/coupons/:code/delete, GET /seller/stats.
     Push alerts now fire for wishlist price drops and for updates to owned items.
   - Run backend/store-schema-v4.sql ONCE before deploying the Worker.
   - Review text and item names are HTML-escaped.
   - Featured banner is now a live carousel: auto-advances with a gold progress dot, pauses on hover/touch/focus, swipe, arrows, dots, keyboard arrows, parallax icons. Slides are built from live data: Featured items, Update available, Continue learning, New release, Bundle deal, Smart21 Plus.
