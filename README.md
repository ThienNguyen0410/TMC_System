# TMC System

TMC System is an employee attendance management application built for a software-architecture course project. Employees issue a short-lived QR code from their own account and scan it at a kiosk to check in and out; administrators review attendance reports, export them as CSV and manage employee profiles.

The API, database and most screens are real: authentication with JWT and a refresh cookie, password reset over SMTP, QR attendance with a geofence, attendance reports, and admin account management. The administrator dashboard and profile editing still read local mock data — see [Still mocked](#still-mocked).

## Features

- **Accounts** — sign up, sign in, sign out, session refresh, profile read.
- **Password reset** — emailed single-use link that also revokes existing sessions.
- **QR attendance** — a 5-second single-use QR issued to the signed-in employee, scanned by a kiosk page through the camera.
- **Geofence and cooldown** — the QR and the kiosk must be within 1 m of each other; a second scan within 30 s is rejected.
- **Reports** — per employee per day: check-in, check-out, status and working hours, with CSV export for admins.
- **Administration** — admin-only account list, profile editing and account deletion, plus role-based routing.

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, Ant Design 6, React Router 7, SCSS, `qrcode.react`, `jsQR`, `dayjs` |
| Backend | Node.js 22 (TypeScript run with type stripping), Express 5, Zod 4, `pg`, `jose` (JWT), `nodemailer`, `cookie-parser`, `cors` |
| Database | PostgreSQL 16 in Docker, `node-pg-migrate` |
| Tooling | oxlint, `tsc` project references, Node's built-in test runner |

## Architecture

Every backend module follows the same layering:

```text
HTTP → route → controller (Zod) → service → repository interface → Postgres repository → PostgreSQL
```

- `src/backend/app.ts` is the composition root: it creates repositories, services, controllers and routers. Nothing else resolves dependencies.
- Classes take their dependencies through the constructor and keep them in `private readonly` fields.
- `src/backend/shared/` holds framework-agnostic pieces: `AppError` subclasses, the Express error and 404 handlers, password hashing, token helpers and the test HTTP harness.
- `src/backend/infrastructure/external/` holds adapters to the outside world (SMTP mail, HR/Payroll HTTP and logging gateways).
- Node executes the `.ts` files directly, so imports carry the `.ts` extension and the code must stay erasable: no `enum`, no constructor parameter properties, `import type` for types.

| Module | Contents |
| --- | --- |
| `modules/user` | accounts, sessions, password reset, auth middleware, admin profile management |
| `modules/attendance` | QR issuing and validation, scanning, attendance records, outbox event |
| `modules/report` | daily aggregation, status classification, CSV formatting |

## Getting started

### Requirements

- **Node.js 22.18 or newer** — the API runs TypeScript with Node's type stripping; Node 22.12 fails with `ERR_UNKNOWN_FILE_EXTENSION .ts`.
- **npm 10 or newer**
- **Docker with Compose** — PostgreSQL runs in a container on host port 5432.
- A modern browser. The kiosk needs a camera, and browsers only expose it on `localhost` or HTTPS.

### Environment

```bash
cp .env.example .env
```

Then fill in `DB_PASSWORD`, `DATABASE_URL` (same credentials) and `JWT_ACCESS_SECRET`. The API refuses to start if `JWT_ACCESS_SECRET` is missing, a numeric setting is not positive, or the report time zone / late threshold is malformed.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` in `.env.example` (`3001` in code) | API port; the Vite proxy follows this value. |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | — | Postgres connection used by the pool. |
| `DATABASE_URL` | — | The same database in URL form, for `node-pg-migrate`. |
| `JWT_ACCESS_SECRET` | — | **Required.** HS256 key for access tokens. |
| `ACCESS_TOKEN_TTL_SECONDS` | `900` | Access token lifetime (15 minutes). |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | Refresh token lifetime. |
| `PASSWORD_RESET_TTL_MINUTES` | `30` | Reset link lifetime. |
| `APP_BASE_URL` | `http://localhost:5173` | Origin used to build reset links. |
| `COOKIE_SECURE` | `false` | Must be `true` in production. |
| `ALLOWED_ORIGINS` | — | Comma-separated CORS origins; required in production. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | — / `587` | Reset mail. `SMTP_HOST` is required in production; without it the API logs the failure and still answers `202`. |
| `REPORT_TIME_ZONE` | `Asia/Ho_Chi_Minh` | IANA zone that decides which local day an event belongs to. |
| `REPORT_LATE_AFTER` | `09:00:00` | Check-ins after this time count as late. |

`NODE_ENV=production` additionally requires `COOKIE_SECURE=true`, `ALLOWED_ORIGINS` and `SMTP_HOST`.

The frontend calls relative `/api/...` URLs, which the Vite dev proxy forwards. Set `VITE_API_BASE_URL` to override the base.

### Database

```bash
npm run db:up        # starts Postgres 16 in Docker (host port 5432)
npm run db:migrate   # applies src/database/migrations
```

| Command | Effect |
| --- | --- |
| `npm run db:down` | Stops the container, keeps the data volume. |
| `npm run db:reset` | **Destroys all data**, recreates the container and migrates. |
| `npm run db:rollback` | Reverts the last migration. |
| `npm run db:new -- <name>` | Creates the next numbered migration file. |

`src/database/TMC_db.sql` is the historical schema snapshot. Do not run it: `0001_baseline.sql` reproduces it and later migrations move past it.

### Run

```bash
npm install
npm run api   # API on http://localhost:<PORT>
npm run dev   # Vite on http://localhost:5173
```

Both commands watch for changes. Restart both if you change `PORT`.

### Demo accounts

| Username | Password | Role | Lands on |
| --- | --- | --- | --- |
| `employee01` | `Employee123!` | `employee` | `/employee/dashboard` |
| `admin01` | `Admin123!` | `admin` | `/admin/dashboard` |
| `admin` | `123456` | `employee` | `/employee/dashboard` |

The first two have one-click demo buttons on the login page. `admin` is a legacy account with a 6-character password, so it is not created through the password policy.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server with the `/api` proxy. |
| `npm run api` | Backend with `--watch`. |
| `npm run build` | `tsc -b` plus the production frontend build. |
| `npm run lint` | oxlint. |
| `npm test` | Backend tests via `node --test` (`*.test.ts`). |
| `npm run preview` | Serves the production build. |
| `npm run db:*` | See the database table above. |

## API

Success responses are wrapped in `data`, failures in `error: { code, message }`. Full payloads and error codes are in [`API.md`](API.md).

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/api/health` | public |
| `POST` | `/api/auth/register` | public |
| `POST` | `/api/auth/login` | public |
| `POST` | `/api/auth/refresh` | refresh cookie |
| `POST` | `/api/auth/logout` | refresh cookie |
| `GET` | `/api/auth/me` | bearer token |
| `POST` | `/api/auth/forgot-password` | public |
| `POST` | `/api/auth/reset-password` | public |
| `GET` | `/api/users` | admin |
| `PUT` | `/api/users/{id}` | admin |
| `POST` | `/api/attendance/qr-codes` | bearer token |
| `POST` | `/api/attendance/scan` | public (kiosk) |
| `GET` | `/api/reports/attendance` | admin |
| `GET` | `/api/reports/attendance/me` | bearer token |
| `GET` | `/api/reports/attendance/export` | admin, CSV download |

Roles: `employee`, `production_supervisor`, `hr`, `security_guard`, `admin`, `executive_management`. The role is read from the database on every request, so a change applies on the next call.

## How it works

### Sessions

- `POST /api/auth/login` returns the user and a 15-minute JWT, and sets an httpOnly `refresh_token` cookie scoped to `/api/auth` for 7 days.
- Passwords are stored as `scrypt$N$r$p$salt$hash`; only SHA-256 hashes of refresh and reset tokens are stored.
- The frontend keeps the access token in memory (never `localStorage`), sends `credentials: 'include'`, and refreshes once after a `401`.
- `POST /api/auth/refresh` rotates the token in a transaction: the old row is revoked and linked to its replacement, so a replayed token fails.
- Sign-out revokes the refresh token and clears the cookie; the access token itself lives until it expires.

### Password reset

- `POST /api/auth/forgot-password` always answers `202`, whether or not the address belongs to an account.
- A new link invalidates the previous unused one. Links are single-use and expire after `PASSWORD_RESET_TTL_MINUTES`.
- Using a link sets the new password, stamps `password_changed_at`, and revokes every refresh token for the account.

### QR attendance

1. The employee opens the QR dialog; the browser reports its position and the frontend calls `POST /api/attendance/qr-codes`.
2. The API stores a hashed token valid for **5 seconds**, bound to the employee and that location.
3. The kiosk reads the code with the camera (`jsQR`) and posts the raw token plus its own position to the public `POST /api/attendance/scan`.
4. The API checks that the QR is live and unused, that the two positions are within **1 m**, and that the employee is still active.
5. A **30-second cooldown** prevents double scans; the event alternates check-in and check-out based on the previous record.
6. Recording is one transaction: the QR is marked used, the attendance row is inserted, and an `attendance.recorded` event is written to `attendance.outbox`.

The kiosk needs no login, and the QR carries no employee identity — only an unguessable random token.

### Reports

- Events are grouped per employee and per local day in `REPORT_TIME_ZONE`; each row holds the earliest check-in and the latest check-out.
- `absent` rows are generated for active employees on weekdays without events, up to today.
- Status: `absent` (no events), `incomplete` (one end missing, or check-out before check-in), `late` (first check-in after `REPORT_LATE_AFTER`), otherwise `present`.
- Query with a single `date`, or an inclusive `startDate`/`endDate` range of at most 366 days; no date means today.
- CSV export is UTF-8 with a BOM, CRLF line endings, and a guard that prefixes cells starting with `=`, `+`, `-`, `@`, a tab or a carriage return so spreadsheets do not execute them.

## Data model

| Schema | Tables |
| --- | --- |
| `"user"` | `users` (account and profile, `is_active`, `password_hash`), `refresh_tokens`, `password_resets`, `test_account` (legacy, unused) |
| `role` | `roles`, `account_roles`, plus `permissions` and `role_permissions` (schema only, unused) |
| `attendance` | `attendance_records`, `qr_codes` (hashed token, `location` JSONB, expiry), `outbox`, `gates` (legacy, written as `NULL`) |
| `report` | `report_definitions`, `report_generations` (schema only, unused) |

The nine migrations in `src/database/migrations/` are, in order: the baseline snapshot, user hardening (password change stamp, case-insensitive unique email, base roles), refresh tokens, password resets, demo accounts, extra roles, QR geolocation, a role repair/backfill, and dropping the legacy `attendance_records.locations` column.

## Frontend

| Route | Page | Access |
| --- | --- | --- |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | auth pages | public |
| `/kiosk` | camera scanner | public |
| `/employee/dashboard`, `/employee/profile` | employee area | signed in, not an admin |
| `/admin/dashboard`, `/admin/management`, `/admin/statistics`, `/admin/profile` | admin area | `admin` only |

Auth state lives in `context/AuthContext.tsx`. Login, sign-up, sign-out, password reset, the kiosk, the reports page, the employee dashboard and the admin Management page all call the API.

### Still mocked

- `/admin/dashboard` statistics, trend and recent activity come from `mocks/attendance.ts` and `mocks/statistics.ts`; its employee count comes from the mock list in `AuthContext`.
- Profile editing on the profile pages (`components/profile/EditProfileModal.tsx`) applies `localStorage` overrides instead of calling the API. Admins edit employees on `/admin/management`.

## Known limitations

- A shift that ends after midnight produces no working hours; there is no night-shift support.
- No rate limiting on `/api/attendance/scan`, `/api/auth/forgot-password` or login attempts.
- `GET /api/users` returns every active account; search and paging happen in the browser.
- Absence is weekday-only — public holidays are not modelled.
- `POST /api/auth/register` accepts the role from the client; a real deployment must assign it server-side.
- Deleting an account deactivates it and cannot be undone from the UI; there is no restore endpoint, so reactivating means setting `is_active` back in the database.
- The HR/Payroll gateways in `infrastructure/external/hr-payroll/` are not wired into `app.ts`; `attendance.outbox` is where a publisher would read from.
- `"user".test_account` holds plaintext demo passwords and is kept only for the historical schema.

## Repository layout

```text
TMC_System/
├── src/
│   ├── backend/
│   │   ├── app.ts                  # composition root
│   │   ├── server.ts
│   │   ├── config/env.ts
│   │   ├── modules/
│   │   │   ├── user/               # auth, sessions, password reset, admin profiles
│   │   │   ├── attendance/         # QR issuing, scanning, outbox
│   │   │   └── report/             # aggregation, statuses, CSV
│   │   ├── infrastructure/external/
│   │   │   ├── mail/               # SMTP reset mail
│   │   │   └── hr-payroll/         # unwired HTTP and logging gateways
│   │   └── shared/                 # errors, http handlers, security, test harness
│   ├── database/
│   │   ├── config.ts               # pg pool + dotenv
│   │   ├── migrations/             # node-pg-migrate SQL, 0001-0009
│   │   └── TMC_db.sql              # legacy snapshot
│   └── frontend/
│       ├── components/             # layout, tables, modals, charts
│       ├── context/  hooks/        # session state
│       ├── pages/                  # auth, employee, admin, kiosk
│       ├── routes/                 # route table and role guard
│       ├── services/               # auth, user, attendance and report API clients
│       ├── mocks/                  # data still used by the admin dashboard
│       ├── styles/  types/  utils/
│       └── App.tsx  main.tsx  theme.ts
├── docker-compose.yml
├── .env.example
├── API.md
├── UI_requirements.md              # UI brief
├── UI_plan.md                      # UI implementation notes
└── Attendance.md  attendance_implement.md  Implements.md   # module notes
```
