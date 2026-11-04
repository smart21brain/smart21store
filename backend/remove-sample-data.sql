-- REMOVES THE SAMPLE CATALOGUE (the 37 demo items that came with the first package) so the store starts empty and real.
-- It does NOT touch: Smart21 Plus / School plans (ids 9001-9004), orders and payments, users, or anything you added yourself (new items get ids above 9004).
-- 1) Back up first:  npx wrangler d1 export smart21store-db --remote --output=backup-before-cleanup.sql
-- 2) Run it:        npx wrangler d1 execute smart21store-db --remote --file=backend/remove-sample-data.sql
-- This cannot be undone except by restoring the backup.

DELETE FROM store_versions WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_previews WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_samples WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_reviews WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_library WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_wishlist WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_watch WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_progress WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_item_views WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_search_hits WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_class_items WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_device_files WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_items WHERE id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
-- Demo bundles that pointed at sample items:
DELETE FROM store_collections;
-- Sample coupons (remove the two lines below if you want to keep SMART21 / WELCOME10):
DELETE FROM store_coupons WHERE code IN ('SMART21','WELCOME10');
-- Only if you ran store-schema-v6.sql (device downloads):
-- DELETE FROM store_platform_files WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
