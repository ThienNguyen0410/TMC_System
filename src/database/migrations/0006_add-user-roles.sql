-- Up Migration

INSERT INTO "role".roles (name, description)
VALUES
    ('production_supervisor', 'Production Supervisor'),
    ('hr', 'Human Resources'),
    ('security_guard', 'Security Guard'),
    ('executive_management', 'Executive Management')
ON CONFLICT (name) DO NOTHING;

-- Down Migration

DELETE FROM "role".roles roles
WHERE roles.name IN (
    'production_supervisor',
    'hr',
    'security_guard',
    'executive_management'
)
AND NOT EXISTS (
    SELECT 1
    FROM "role".account_roles account_roles
    WHERE account_roles.role_id = roles.id
);
