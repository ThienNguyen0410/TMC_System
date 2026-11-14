-- Up Migration

-- RBAC permission catalogue and the default grants for the two system roles.
-- Data only: no schema changes.

INSERT INTO "role".permissions (code, description)
VALUES
    ('qr.view_own',         'View own QR code'),
    ('attendance.view_own', 'View own attendance records'),
    ('user.manage',         'View, update and delete employee accounts'),
    ('qr.manage',           'Issue, revoke and reissue QR codes'),
    ('gate.manage',         'Register and configure gate stations'),
    ('gate.monitor',        'Monitor gate station status'),
    ('gate.override',       'Manually override a gate'),
    ('attendance.monitor',  'Monitor real-time attendance'),
    ('attendance.adjust',   'Manually adjust attendance records'),
    ('report.view',         'View attendance reports'),
    ('report.export',       'Export attendance reports'),
    ('payroll.export',      'Send attendance data to HR/Payroll'),
    ('audit.view',          'View audit logs'),
    ('shift.manage',        'Configure shift schedules'),
    ('rbac.manage',         'Manage roles and permissions')
ON CONFLICT (code) DO NOTHING;

INSERT INTO "role".role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM "role".roles r
JOIN "role".permissions p ON p.code IN ('qr.view_own', 'attendance.view_own')
WHERE r.name = 'employee'
ON CONFLICT DO NOTHING;

INSERT INTO "role".role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM "role".roles r
JOIN "role".permissions p ON p.code IN (
    'qr.view_own', 'attendance.view_own', 'user.manage', 'qr.manage',
    'gate.manage', 'gate.monitor', 'gate.override', 'attendance.monitor',
    'attendance.adjust', 'report.view', 'report.export', 'payroll.export',
    'audit.view', 'shift.manage', 'rbac.manage'
)
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Down Migration

DELETE FROM "role".permissions
WHERE code IN (
    'qr.view_own', 'attendance.view_own', 'user.manage', 'qr.manage',
    'gate.manage', 'gate.monitor', 'gate.override', 'attendance.monitor',
    'attendance.adjust', 'report.view', 'report.export', 'payroll.export',
    'audit.view', 'shift.manage', 'rbac.manage'
);
