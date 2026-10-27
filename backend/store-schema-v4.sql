-- Run ONCE after v3 (ALTER TABLE cannot be re-run):
--   npx wrangler d1 execute smart21store-db --remote --file=backend/store-schema-v4.sql
ALTER TABLE store_items ADD COLUMN has_icon INTEGER DEFAULT 0;   -- upload time (unix seconds) of the square app icon, 0 = none
ALTER TABLE store_items ADD COLUMN editors INTEGER DEFAULT 0;    -- 1 = shown in "Editors' choice"
-- store_items.featured (already exists) now drives the banners at the top of "For you".
