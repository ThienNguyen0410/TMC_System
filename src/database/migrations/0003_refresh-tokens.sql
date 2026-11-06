-- Up Migration

-- Only the SHA-256 hash of a refresh token is stored; the raw value lives in
-- the client's httpOnly cookie.
CREATE TABLE IF NOT EXISTS "user".refresh_tokens (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL
        REFERENCES "user".users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    replaced_by_id BIGINT
        REFERENCES "user".refresh_tokens(id) ON DELETE SET NULL,
    user_agent TEXT,
    ip INET
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
    ON "user".refresh_tokens(user_id);

-- Down Migration

DROP TABLE IF EXISTS "user".refresh_tokens;
