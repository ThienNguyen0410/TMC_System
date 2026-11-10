-- Up Migration

-- attendance.attendance_records.locations only exists in databases created
-- from the historical TMC_db.sql snapshot. The application never writes that
-- column (GPS is stored in attendance.qr_codes.location and the outbox
-- payload), so remove it to match the schema from 0001_baseline.

ALTER TABLE attendance.attendance_records
    DROP COLUMN IF EXISTS locations;

-- Down Migration

ALTER TABLE attendance.attendance_records
    ADD COLUMN IF NOT EXISTS locations JSON NOT NULL DEFAULT '{}'::json;
