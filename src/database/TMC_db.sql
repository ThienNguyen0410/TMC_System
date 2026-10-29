
-- =========================================
-- 1. USER SCHEMA
-- =========================================

CREATE SCHEMA IF NOT EXISTS "user";

CREATE TABLE IF NOT EXISTS "user".employees (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    department VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "user".accounts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    employee_id BIGINT UNIQUE
        REFERENCES "user".employees(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================
-- 2. ROLE SCHEMA
-- =========================================

CREATE SCHEMA IF NOT EXISTS "role";

CREATE TABLE IF NOT EXISTS "role".roles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS "role".permissions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS "role".account_roles (
    account_id BIGINT NOT NULL
        REFERENCES "user".accounts(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL
        REFERENCES "role".roles(id) ON DELETE CASCADE,
    PRIMARY KEY (account_id, role_id)
);

CREATE TABLE IF NOT EXISTS "role".role_permissions (
    role_id BIGINT NOT NULL
        REFERENCES "role".roles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL
        REFERENCES "role".permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);


-- =========================================
-- 3. ATTENDANCE SCHEMA
-- =========================================

CREATE SCHEMA IF NOT EXISTS attendance;

CREATE TABLE IF NOT EXISTS attendance.gates (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    gate_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS attendance.qr_codes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id BIGINT NOT NULL
        REFERENCES "user".employees(id),
    token_hash TEXT NOT NULL UNIQUE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS attendance.attendance_records (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id BIGINT NOT NULL
        REFERENCES "user".employees(id),
    gate_id BIGINT
        REFERENCES attendance.gates(id),
    event_type VARCHAR(20) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source VARCHAR(30) NOT NULL DEFAULT 'QR',

    CONSTRAINT chk_attendance_event_type
        CHECK (event_type IN ('CHECK_IN', 'CHECK_OUT'))
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_time
    ON attendance.attendance_records(employee_id, recorded_at);


-- =========================================
-- 4. REPORT SCHEMA
-- =========================================

CREATE SCHEMA IF NOT EXISTS report;

CREATE TABLE IF NOT EXISTS report.report_definitions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================
-- 5. OUTBOX TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS attendance.outbox (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id UUID NOT NULL UNIQUE,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(150) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,

    CONSTRAINT chk_outbox_retry_count
        CHECK (retry_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_outbox_unpublished
    ON attendance.outbox(created_at)
    WHERE published_at IS NULL;
