
-- ===== Langkah 9d (aman dijalankan berulang) =====
ALTER TABLE assets ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';
UPDATE assets SET images = ARRAY[photo] WHERE photo IS NOT NULL AND photo <> '' AND images = '{}';
ALTER TABLE requests ALTER COLUMN asset_id DROP NOT NULL;
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_asset_id_fkey;
ALTER TABLE requests ADD CONSTRAINT requests_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL;
