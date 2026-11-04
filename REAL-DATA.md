# Real data only

## What was fake and is now gone
- The store page had a built-in demo catalogue (10 items with made-up ratings, downloads, "Only 3 left" stock, and two made-up reviews) that appeared whenever your database was empty. It is removed. An empty database now shows an empty store.
- Made-up exchange rates (USD, KES) are removed. Rates now come only from `RATES_JSON` in `wrangler.toml`; with none set, prices show in TSh only.
- Items with no reviews now show "New" instead of a rating of 0.
- The package no longer contains `seed-all-samples.sql`, `sample-files/` or `upload-samples.*`.

## What was already real (no change needed)
Ratings are calculated from real reviews (only people who own an item can review). Download counts, orders, earnings, sales stats, library, wishlist and progress all come from your database. Payments are confirmed by the signed payment webhook, not by the page.

## Clean your live store (once)
1. Back up: `npx wrangler d1 export smart21store-db --remote --output=backup-before-cleanup.sql`
2. Remove the sample items: `npx wrangler d1 execute smart21store-db --remote --file=backend/remove-sample-data.sql`
   This deletes the 37 sample items (ids 1-6 and 12-42), their reviews, libraries and wishlists, the demo bundles, and the two sample coupons (edit the file if you want to keep the coupons). It keeps the Smart21 Plus and School plans (ids 9001-9004), all orders and users.
3. Deploy: `npx wrangler deploy`
4. Sample files uploaded to R2 stay there and cost storage. Delete them in the Cloudflare dashboard (R2 > your bucket > store/) if you no longer need them.

## Start building real data
- Admin tab > upload your real files and devices, with real titles, descriptions, prices and previews.
- Set real exchange rates if you want other currencies: in `wrangler.toml` under `[vars]`, `RATES_JSON = '{"USD":0.0004,"KES":0.05}'` (units per 1 TSh), and update them as rates change.
- Create your own coupons and bundles only when you run real promotions.
- Ratings, downloads and sales will fill in by themselves as real people use the store.
