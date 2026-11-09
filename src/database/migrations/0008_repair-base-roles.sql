-- Up Migration

-- Repair databases where the base roles from 0002 are missing. Without them,
-- createAccount() silently assigns no role and login falls back to "employee".

INSERT INTO "role".roles (name, description)
VALUES
    ('admin', 'Administrator'),
    ('employee', 'Employee')
ON CONFLICT (name) DO NOTHING;

-- Accounts that should be administrators. Extend this list as needed.
INSERT INTO "role".account_roles (account_id, role_id)
SELECT u.id, r.id
FROM "user".users u
JOIN "role".roles r ON r.name = 'admin'
WHERE u.username IN ('admin01', 'admin02', 'admin03', 'newadmin')
ON CONFLICT DO NOTHING;

-- Every other account without a role gets the least-privileged role.
INSERT INTO "role".account_roles (account_id, role_id)
SELECT u.id, r.id
FROM "user".users u
JOIN "role".roles r ON r.name = 'employee'
WHERE NOT EXISTS (
    SELECT 1
    FROM "role".account_roles existing
    WHERE existing.account_id = u.id
)
ON CONFLICT DO NOTHING;

-- Down Migration

-- Data repair only; intentionally not reverted.
SELECT 1;
