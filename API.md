# TMC Attendance API

Backend endpoints for connecting the frontend. Everything lives under `/api`.

- Dev server: `npm run api` → `http://localhost:5000` (port from `PORT` in `.env`).
- The Vite dev server proxies `/api` to that port, so frontend calls are relative: `/api/...`.
- Requires the Postgres container (`npm run db:up`) and migrations (`npm run db:migrate`).
- Requests and responses are JSON (`Content-Type: application/json`, body limit 100kb).

## Conventions

Success is always wrapped in `data`:

```json
{ "data": { "user": { "id": "2", "username": "admin01", "role": "admin" } } }
```

Failure is always wrapped in `error`:

```json
{ "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid username or password." } }
```

| Status | Code                  | Meaning                              |
| ------ | --------------------- | ------------------------------------ |
| 400    | `VALIDATION_ERROR`    | A field failed validation            |
| 400    | `INVALID_JSON`        | Body is not valid JSON               |
| 401    | `INVALID_CREDENTIALS` | Bad login, missing/expired token     |
| 404    | `NOT_FOUND`           | No such route                        |
| 409    | `CONFLICT`            | Username or email already registered |
| 500    | `INTERNAL_ERROR`      | Unexpected server error              |

### Authentication

- Protected routes need `Authorization: Bearer <accessToken>`.
- The access token is a JWT (HS256) valid for **15 minutes** and is returned in the login/refresh body.
- The refresh token is **not** in the body. It is an httpOnly cookie named `refresh_token`, scoped to `Path=/api/auth`, `SameSite=Lax`, valid for **7 days**.
- Because of that cookie, browser calls must use `credentials: 'include'`.
- CORS allows only `ALLOWED_ORIGINS` from `.env` (default `http://localhost:5173`), with credentials enabled.

### Roles

`employee`, `production_supervisor`, `hr`, `security_guard`, `admin`, `executive_management`.

The role in every response is read from the database on each request, so role changes take effect immediately.

---

## GET /api/health

Liveness check. No auth.

```json
{ "data": { "status": "ok" } }
```

---

## POST /api/auth/register

Creates an account. Does **not** log the user in — call `/login` afterwards.

| Field         | Type   | Rules                                                |
| ------------- | ------ | ---------------------------------------------------- |
| `fullName`    | string | 2–60 chars, trimmed                                  |
| `username`    | string | 4–20 chars, `a-zA-Z0-9._-`, lowercased               |
| `password`    | string | 8+ chars with lowercase, uppercase, digit and symbol |
| `email`       | string | valid email, max 100 chars, lowercased               |
| `phone`       | string | `0` or `+84` followed by 9 digits, e.g. `0901234567` |
| `dateOfBirth` | string | `YYYY-MM-DD`, not in the future                      |
| `role`        | string | one of the roles above                               |

```http
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "Nguyen Van An",
  "username": "employee09",
  "password": "Secret123!",
  "email": "employee09@example.com",
  "phone": "0901234567",
  "dateOfBirth": "2003-05-15",
  "role": "employee"
}
```

`201 Created`

```json
{ "data": { "user": { "id": "14", "username": "employee09", "role": "employee" } } }
```

Errors: `400 VALIDATION_ERROR`, `409 CONFLICT` (`"Username or email is already registered."`).

The role comes from the request — the current UI depends on that. In a real deployment this field should be server-side only.

---

## POST /api/auth/login

| Field      | Type   | Rules                              |
| ---------- | ------ | ---------------------------------- |
| `username` | string | required, trimmed, case-insensitive |
| `password` | string | required                           |

```http
POST /api/auth/login
Content-Type: application/json

{ "username": "admin01", "password": "Admin123!" }
```

`200 OK`

```json
{
  "data": {
    "user": { "id": "2", "username": "admin01", "role": "admin" },
    "accessToken": "eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

Also sets the `refresh_token` cookie.

Errors: `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS` (unknown user, wrong password, or deactivated account — same message for all three).

---

## POST /api/auth/refresh

Reads the `refresh_token` cookie and returns a new access token, rotating the refresh token. No request body.

```http
POST /api/auth/refresh
Cookie: refresh_token=... (sent automatically by the browser)
```

`200 OK` — same body as login, plus a new `Set-Cookie`.

Errors: `401 INVALID_CREDENTIALS` when the cookie is missing, expired, revoked, or already used.


---

## GET /api/auth/me

Returns the authenticated user. Requires `Authorization: Bearer <accessToken>`.

```json
{ "data": { "user": { "id": "2", "username": "admin01", "role": "admin" } } }
```

Errors: `401 INVALID_CREDENTIALS` when the header is missing/invalid, the token expired, or the account was deactivated.

---

## POST /api/auth/logout

Revokes the refresh token from the cookie and clears it. No request body.

`204 No Content`, empty body. No auth header needed. The access token itself stays valid until it expires (up to 15 minutes).

---

## Frontend usage

```ts
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export async function api<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    credentials: 'include', // sends/receives the refresh cookie
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? 'Request failed')
  }

  return payload?.data as T
}
```

```ts
// login
const { user, accessToken } = await api<{ user: User; accessToken: string }>('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username, password }),
})
// keep accessToken in memory (React state/context), not localStorage

// authenticated call
const { user } = await api<{ user: User }>('/auth/me', {}, accessToken)

// logout
await api('/auth/logout', { method: 'POST' })
```

Notes:

- Keep the access token in memory. `localStorage` makes it readable by any XSS.
- Do not set `Content-Type` on `/refresh` or `/logout`; they take no body and only read the cookie.
- Call `POST /api/auth/logout` before clearing local state, otherwise the refresh cookie and its DB row survive the sign-out.

### Current frontend gap

`src/frontend/services/auth.api.ts` only reads `data.user` from the login response and drops `accessToken`; nothing calls `/refresh`, `/logout` or `/me` yet. Sign-up, profile edit and delete are still `localStorage` mocks.
