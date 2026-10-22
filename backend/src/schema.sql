CREATE TABLE IF NOT EXISTS assets (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  building    TEXT,
  location    TEXT NOT NULL DEFAULT 'Semarang',
  category    TEXT NOT NULL CHECK (category IN ('rapat','aula','cowork','barang','mobil')),
  capacity    INTEGER,
  stock       INTEGER,
  facilities  TEXT[] NOT NULL DEFAULT '{}',
  photo       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'helpdesk' CHECK (role IN ('admin','helpdesk')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requests (
  id                  SERIAL PRIMARY KEY,
  asset_id            INTEGER NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  asset_name          TEXT NOT NULL,
  requester_name      TEXT NOT NULL,
  requester_instansi  TEXT NOT NULL,
  requester_phone     TEXT NOT NULL,
  requester_email     TEXT NOT NULL,
  agenda              TEXT NOT NULL,
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL DEFAULT '22:00',
  qty                 INTEGER NOT NULL DEFAULT 1 CHECK (qty >= 1),
  status              TEXT NOT NULL DEFAULT 'Menunggu'
                      CHECK (status IN ('Menunggu','Disetujui','Ditolak','Dibatalkan','Selesai')),
  reject_reason       TEXT,
  cancel_reason       TEXT,
  decided_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  decided_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_requests_asset_dates ON requests (asset_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests (status);

CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id  INTEGER REFERENCES requests(id) ON DELETE SET NULL,
  text        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read);


-- ===== Langkah 9d (aman dijalankan berulang) =====
ALTER TABLE assets ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';
UPDATE assets SET images = ARRAY[photo] WHERE photo IS NOT NULL AND photo <> '' AND images = '{}';
ALTER TABLE requests ALTER COLUMN asset_id DROP NOT NULL;
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_asset_id_fkey;
ALTER TABLE requests ADD CONSTRAINT requests_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL;

-- ===== Langkah 9e (aman dijalankan berulang) =====
ALTER TABLE requests ADD COLUMN IF NOT EXISTS requester_nip TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS placement TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS length DOUBLE PRECISION;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS width DOUBLE PRECISION;

-- ===== Langkah 9g (aman dijalankan berulang) =====
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kategori kini bisa dibuat helpdesk, jadi batasan "hanya 5 kategori" pada tabel assets dihapus
-- (kategori diperiksa oleh server).
DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'assets'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%category%'
  LOOP
    EXECUTE format('ALTER TABLE assets DROP CONSTRAINT %I', c);
  END LOOP;
END $$;