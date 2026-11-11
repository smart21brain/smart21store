## Real data only
- Removed the built-in demo catalogue, fake stock/reviews/rates and the sample seed + files. Added backend/remove-sample-data.sql. See REAL-DATA.md.

## Phone + computer downloads
- New table store_platform_files (backend/store-schema-v6.sql), endpoints GET /api/store/platforms/:id and POST /api/store/admin/items/:id/platform, device picker on Download, admin upload box. See PLATFORMS.md.

## SEO update
- Added src/seo.js: robots.txt, sitemap.xml, crawlable /item/<id>-<name> pages, canonical + social tags + structured data on the store page. See SEO.md for the 4 setup steps (set SITE_URL, Search Console, sitemap, request indexing).
- wrangler.toml: Worker runs first for /, /smart21store(.html), /robots.txt, /sitemap.xml, /item/*. Redeploy with `npx wrangler deploy`.

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

5. v5 features (run backend/store-schema-v5.sql ONCE, then deploy)
   - Trending searches + recent searches under the search box; Recently viewed shelf on Home.
   - Price watch ("Notify me on price drop") with push alerts; Watching list in Library.
   - Reviews: Helpful votes, sort (newest / highest / most helpful), verified-only filter, seller replies.
   - Compare up to 3 devices side by side.
   - Share poster with a real QR code for items, classes and invites (download / print).
   - Classes: teacher creates a class, students join with a code (or ?join=CODE), teacher pushes free or Classroom/School-licensed files, progress report per student.
   - Gifts: gift message at checkout, "Send as a gift" button; recipients get a notification with the message.
   - Shareable wishlists (?list=CODE): visitors can gift items straight to the owner's library.
   - Rewards: points for installs, reviews, referrals and a daily streak; redeem for one-time coupons.
   - Invite friends page with code, WhatsApp share, poster and friends-joined progress.
   - Download manager: chunked, resumable downloads kept in IndexedDB, pause / resume / cancel, auto-resume when the connection returns while the app is open.
   - French and Arabic (right-to-left) for all new screens; Swahili completed.
   - Accessibility: text size, high contrast, reduce motion, easier-reading spacing, Listen (read aloud).
   - Seller insights in Studio: views (30 days), conversion, search words that led to each item.
   - Checkout now validates coupon codes with the server (GET /api/store/coupon/:code), so Studio and Rewards coupons show their real discount.

6. Apps first + app slides
   - Apps (installable files .apk/.aab/.exe/.msi/.dmg/.ipa/.deb, or anything published as "Application" in the Publish console) now sort before files in Files, Top charts, search results and the Home shelves.
   - New "Apps" shelf sits directly below the banner on Home (newest first).
   - The Home banner carousel now starts with a "New app" slide for each of the 3 newest apps. It appears automatically after an upload (the catalog reloads every 60 seconds). If you uploaded screenshots, the first one shows in the slide; they all show on the app's details page.
   - Service worker cache is now s21store-v5. Hard-refresh once after deploying. No database change needed.

7. Admin dashboard ready for uploads
   - Admin uploads publish immediately, even if SCAN_URL is set. Seller uploads still go to scan/review.
   - Files over 96 MB now upload from the Publish console in 32 MB parts (no 100 MB limit, no wrangler step). Each part retries twice. New endpoints: /api/store/admin/uploads/start, /part, /finish.
   - Studio > Items: items stuck in "scanning" now have a "Publish anyway" button.
   - Service worker cache is now s21store-v6.
   - Deploy with: npx wrangler deploy (no database change).

## v8: Banner + trailer on the store page (Play Store style)
- Admin Publish console and Studio can now upload: app icon, wide **banner image** (5 MB), **trailer** (MP4/WebM up to 100 MB, or a YouTube link) and screenshots. Everything shows on the website straight away.
- Details page: big banner hero with title, rating, size, downloads and Install on it, a "Watch trailer" button that plays the video inside the hero, trailer tile + arrows in the screenshot strip, tap a screenshot to enlarge, "More from developer / Similar" sidebar on laptops.
- Responsive: phone (banner on top, details below), tablet and laptop (banner behind the title, two columns on laptop).
- Featured carousel and share/SEO previews use the banner.
- Also fixed: the catalogue now loads on first open for visitors who are not signed in.
- **Run once before deploying:** `npx wrangler d1 execute smart21store-db --remote --file=backend/store-schema-v8.sql`, then `npx wrangler deploy`.
- New API: POST /api/store/admin/items/:id/banner, POST /api/store/admin/items/:id/trailer, GET /api/store/banner/:id, GET /api/store/trailer/:id.

## v9: Downloads for every device (APK, Windows, Mac, iOS, Linux)
- Publish console: new "Downloads for each device" section. Pick an APK, a Windows file, a Mac file, an iOS .ipa and/or a Linux file and they all upload together with the item. If the big main drop box is empty, the first device file is used as the main file (not uploaded twice).
- Store page: "Available on" chips (Android, Windows PC, iOS...) under the title and in About. Download now always opens "Choose your download" listing only the devices that have a file, with file type and size, and marks the one matching the visitor's device.
- Fixed: signed-in users (download manager) were never offered the device choice and always got the main file. They now get the picker too.
- iOS: .ipa files cannot be installed straight from a website by iPhone users (Apple restriction); the file downloads, but installing needs TestFlight, enterprise signing or a Mac.
- Device files are limited to 100 MB each (Cloudflare request limit). No new database migration for v9.
