-- Up Migration

ALTER TABLE attendance.qr_codes
    ADD COLUMN IF NOT EXISTS location JSONB;

-- Down Migration

ALTER TABLE attendance.qr_codes DROP COLUMN IF EXISTS location;
