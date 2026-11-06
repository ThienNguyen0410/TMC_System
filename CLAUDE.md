# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run everything from the repo root. Needs Node.js 22.18+ (the backend runs `.ts` files directly, no build step) and a local PostgreSQL.

| Command | Purpose |
| --- | --- |
| `npm run api` | Backend on `PORT` from `.env` (`node --watch src/backend/server.ts`) |
| `npm run dev` | Vite frontend on :5173; proxies `/api` to `http://localhost:$PORT` (default 3001). Restart it if `PORT` changes |
| `npm run build` | `tsc -b` (three projects) then `vite build` |
| `npm run lint` | `oxlint` |

`npm test` runs the backend tests (`node --test`, no dependencies); there is no frontend test runner. A single file: `node --test src/backend/modules/report/service/attendance-csv.test.ts`. Tests must not import `app.ts`, `env.ts` or `database/config.ts`, which open a database pool. For a typecheck of one half use `npx tsc -p tsconfig.app.json` (frontend) or `npx tsc -p tsconfig.backend.json` (backend).

DB setup: create database `TMC_DB`, then `psql -U postgres -d TMC_DB -f src/database/TMC_db.sql`. `.env` needs `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (see README.md for the full setup and the seeded login accounts).

## Architecture

Three independent halves in one repo, each with its own tsconfig: `src/frontend` (React 19 + Vite + Ant Design 6 + SCSS), `src/backend` (dependency-free `node:http` server), and `src/database` (pool + SQL schema). `src/back/package.json` is a stray npm-init stub; ignore it.

### Backend
- Layered per module under `src/backend/modules/<module>/` (`routes` → `controller` → `service` → `repository` interface → `postgres-*.repository`). `user` (login only) and `report` (attendance report + CSV export, read-only) exist. `Implements.md` assigns the still-missing `role` and `attendance` modules to team members.
- `app.ts` is the composition root: it hand-wires repository → service → controller → routes and passes a flat `Route[]` to `shared/http/http-server.ts`. That server does exact `method + pathname` matching (no path params), parses JSON bodies, and adds permissive CORS. A new endpoint is a new `Route` entry plus wiring in `app.ts`.
- Throw `AppError` subclasses (`shared/errors/app-error.ts`) from any layer. The HTTP server turns them into `{ error: { code, message } }` with the matching status. Successful responses are `{ data: ... }`. Anything else becomes a 500.
- Use `shared/http/parsers.ts` (`asObject`, `readRequiredString`, ...) to validate request bodies.
- `report` derives attendance status (present/late/absent/incomplete) from `CHECK_IN`/`CHECK_OUT` events in `service` + `domain`; SQL only groups events per employee per local day. A non-JSON response (the CSV) is a string `body` plus `headers` on `HttpResponse`.
- Imports must use explicit `.ts` extensions because Node runs the sources directly. `erasableSyntaxOnly` is on, so no enums or constructor parameter properties; that is why classes declare fields explicitly.

### Frontend
- Routing is in `routes/AppRoutes.tsx` (lazy pages). `ProtectedRoute` is role-based, with `/employee/*` and `/admin/*` under separate layouts. `/kiosk` and the auth pages are public.
- Only **login** is real (`services/auth.api.ts` → `POST /api/auth/login`). Everything else in `context/AuthContext.tsx` (sign-up, profile edits, user deletion) and all attendance and statistics data (`mocks/`) is fake, persisted in `localStorage` under `tmc.*` keys. The session user is built from the API response in `toSessionUser`, so profile fields such as email and phone are blank until overridden locally.
- Styles are SCSS partials, all registered in `styles/main.scss`. A new partial must be added there with `@use`.

## Gotchas
- **Roles are not stored in the database.** `domain/auth-user.ts` maps usernames to roles with a hardcoded table (`employee01`, `admin01`); any other username is `employee`. Login reads plaintext passwords from `"user".test_account` (`pass_word` column). This is intentional demo code, and the `"user".users` / `role.*` tables are not used yet.
- **`npm run build` fails on the backend project.** `infrastructure/external/hr-payroll/*` import `modules/attendance/attendance.ports.ts` and `attendance.types.ts`, which don't exist. `dev` and `api` are unaffected because nothing imports those gateways.
- **`attendance` tables now reference `"user".users(id)`** (they pointed at a non-existent `"user".employees`). Databases created from the old script need the attendance schema recreated. Confirm with the attendance owner.
- **The report endpoints have no authorization yet** (no JWT or role module).
- **`.gitignore` contains `/ .env` (with a space), so `.env` is actually tracked by git.** Keep real credentials out of it.
- `config/env.ts` reads `process.env.PORT`, but `dotenv` is only loaded as a side effect of importing `database/config.ts`. It works because `server.ts` imports `app.ts` first. Don't reorder those imports.
- `database/config.ts` opens a pool and tests the connection at import time, and it only logs on failure, so the server starts even if the DB is down.
