@echo off
rem Cleans leftovers of the deleted sample items from tables that may not exist in your database.
rem A 'no such table' message just means that table is not used in your store: ignore it.
call npx wrangler d1 execute smart21store-db --remote --yes --command "DELETE FROM store_samples WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42)"
call npx wrangler d1 execute smart21store-db --remote --yes --command "DELETE FROM store_progress WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42)"
call npx wrangler d1 execute smart21store-db --remote --yes --command "DELETE FROM store_watch WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42)"
call npx wrangler d1 execute smart21store-db --remote --yes --command "DELETE FROM store_item_views WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42)"
call npx wrangler d1 execute smart21store-db --remote --yes --command "DELETE FROM store_search_hits WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42)"
call npx wrangler d1 execute smart21store-db --remote --yes --command "DELETE FROM store_class_items WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42)"
call npx wrangler d1 execute smart21store-db --remote --yes --command "DELETE FROM store_platform_files WHERE item_id IN (1,2,3,4,5,6,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42)"
echo Done.
pause
