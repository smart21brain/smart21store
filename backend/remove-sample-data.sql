-- REMOVES THE SAMPLE CATALOGUE (37 demo items from the first package) so the store starts empty and real.
-- Keeps: Smart21 Plus / School plans (ids 9001-9004), orders, payments, users, and anything you added yourself.
-- 1) Back up first:  npx wrangler d1 export smart21store-db --remote --output=backup-before-cleanup.sql
-- 2) Run it:        npx wrangler d1 execute smart21store-db --remote --file=backend/remove-sample-data.sql
-- If anything fails, the database returns to its original state and you can retry.
-- Optional leftovers (tables that only exist after later updates): run backend\remove-sample-data-extras.bat afterwards.

DELETE FROM store_versions WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_previews WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_reviews WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_library WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_wishlist WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_device_files WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_items WHERE id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42);
DELETE FROM store_collections;
-- Sample coupons (delete the next line if you want to keep SMART21 / WELCOME10):
DELETE FROM store_coupons WHERE code IN ('SMART21','WELCOME10');
