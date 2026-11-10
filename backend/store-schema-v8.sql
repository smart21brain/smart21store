-- Run ONCE after v7: banner image + trailer (uploaded video or YouTube link) for each item.
--   npx wrangler d1 execute smart21store-db --remote --file=backend/store-schema-v8.sql
ALTER TABLE store_items ADD COLUMN has_banner INTEGER DEFAULT 0;   -- upload time (unix seconds) of the wide banner image, 0 = none
ALTER TABLE store_items ADD COLUMN has_trailer INTEGER DEFAULT 0;  -- upload time (unix seconds) of the trailer video file, 0 = none
ALTER TABLE store_items ADD COLUMN trailer_url TEXT;               -- YouTube link used instead of a video file
