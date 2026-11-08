-- Up Migration

ALTER TABLE "user".users
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uniq
    ON "user".users (lower(email))
    WHERE email IS NOT NULL;

INSERT INTO "role".roles (name, description)
VALUES
    ('admin', 'Administrator'),
    ('employee', 'Employee')
ON CONFLICT (name) DO NOTHING;

-- Down Migration

DELETE FROM "role".roles WHERE name IN ('admin', 'employee');

DROP INDEX IF EXISTS "user".users_email_lower_uniq;

ALTER TABLE "user".users DROP COLUMN IF EXISTS password_changed_at;
