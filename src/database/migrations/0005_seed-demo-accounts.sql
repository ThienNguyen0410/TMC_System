-- Up Migration

-- Demo accounts. Hashes use scrypt$N$r$p$saltB64$hashB64 with N=16384, r=8, p=1.
-- "admin" keeps the legacy 6-character password; it only logs in, it is never
-- created through the signup/reset flows that enforce the password policy.
INSERT INTO "user".users
    (username, password_hash, full_name, department, phone_number, email, date_of_birth)
VALUES
    (
        'employee01',
        'scrypt$16384$8$1$HU8V9LmLTAyZ4Nl88LTNOg==$ZKt5gU1dqtQRK0inSVn9basOssmyDtVhUwk/BQ/kpQaTDhKn682rOvKeolpfF/gWj1vMcDhcwZquhnC1ZsNEKQ==',
        'Nguyen Van An',
        'Engineering',
        '0901234567',
        'employee01@example.com',
        '2003-05-15'
    ),
    (
        'admin01',
        'scrypt$16384$8$1$nU6aDvs487TsB4ZFtlYMOA==$trhQyoVLtHHLTCf4iCCC6OgJ0MS/bjt3FYiWkgsXQycFGWkkw6FRE/S3a+AmNuH4xNJvrOU5ulbz4X99udJw+A==',
        'TMC Administrator',
        'Administration',
        '0900000001',
        'admin01@example.com',
        '1990-01-01'
    ),
    (
        'admin',
        'scrypt$16384$8$1$zfZ8yv/Nn/+H/U+K3+lRnQ==$DA2y4vA4J/4A9ukAhTDdXKV0LtjuGxWnXIprpTo1tQZKoKLJHsq47s2rF8rRabuCyhF4aZoiqk9cgd+wL81PXQ==',
        'Demo Admin',
        'Administration',
        '0900000002',
        'admin@example.com',
        '1990-01-01'
    )
ON CONFLICT (username) DO NOTHING;

INSERT INTO "role".account_roles (account_id, role_id)
SELECT u.id, r.id
FROM "user".users u
JOIN "role".roles r ON r.name = 'employee'
WHERE u.username IN ('employee01', 'admin')
ON CONFLICT DO NOTHING;

INSERT INTO "role".account_roles (account_id, role_id)
SELECT u.id, r.id
FROM "user".users u
JOIN "role".roles r ON r.name = 'admin'
WHERE u.username = 'admin01'
ON CONFLICT DO NOTHING;

-- Down Migration

DELETE FROM "user".users WHERE username IN ('employee01', 'admin01', 'admin');
