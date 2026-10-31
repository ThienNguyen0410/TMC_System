# TMC System

TMC System is an employee attendance management application for an enterprise environment. The repository contains a React frontend, a Node.js backend, and a PostgreSQL database schema.

The current implementation focuses on authentication. Login credentials are checked against the `"user".test_account` table in PostgreSQL. The application does not use JWT. After a successful login, the frontend stores the current user session in local storage and redirects the user according to their role.

The frontend also includes employee and administrator dashboards, profile pages, attendance tables, a kiosk screen, and administrator statistics. These screens currently use local mock data for attendance, statistics, profile updates, and sign-up.

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Ant Design 6
- React Router
- SCSS
- `qrcode.react` for QR code rendering
- `dayjs` for date handling

### Backend

- Node.js built-in HTTP server
- TypeScript
- PostgreSQL via `pg`
- `dotenv` for environment variables

### Database

- PostgreSQL
- SQL schema and seed data in `src/database/TMC_db.sql`

## Software Requirements

Install the following software before running the project:

- **Node.js 22.18 or newer**
  - The backend runs TypeScript files directly with Node.js, so a recent Node.js 22 release is required.
- **npm 10 or newer**
  - Usually installed together with Node.js.
- **PostgreSQL**
  - A local PostgreSQL server is recommended.
  - `psql` or pgAdmin can be used to create the database and run the SQL file.
- **A modern web browser**
  - Chrome, Edge, Firefox, or a similar browser.

## Environment Variables

Create a `.env` file in the project root directory with the following variables:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=TMC_DB
DB_USER=postgres
DB_PASSWORD=<your_db_password>
```

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port used by the backend server. The Vite development proxy uses the same port. |
| `DB_HOST` | PostgreSQL host. |
| `DB_PORT` | PostgreSQL port. |
| `DB_NAME` | Database name. |
| `DB_USER` | PostgreSQL user. |
| `DB_PASSWORD` | Password of the PostgreSQL user. |

Do not commit the `.env` file to Git. Replace `<your_db_password>` with the password of your local PostgreSQL account.

## Database Setup

### 1. Create the database

Using `psql`:

```powershell
psql -U postgres -c "CREATE DATABASE \"TMC_DB\";"
```

Alternatively, create a database named `TMC_DB` with pgAdmin.

### 2. Create the schemas, tables, and seed data

From the project root:

```powershell
psql -U postgres -d TMC_DB -f src/database/TMC_db.sql
```

The SQL file creates the following schemas:

- `"user"`
- `role`
- `attendance`
- `report`

It also creates the tables used by the application and inserts demo accounts into `"user".test_account`.

### Seeded Login Accounts

| Username | Password | Role | Redirect |
| --- | --- | --- | --- |
| `employee01` | `Employee123!` | `employee` | `/employee/dashboard` |
| `admin01` | `Admin123!` | `admin` | `/admin/dashboard` |
| `admin` | `123456` | `employee` | `/employee/dashboard` |

The two demo accounts `employee01` and `admin01` are the accounts used by the demo buttons on the Login page.

## Installation

From the project root:

```powershell
npm install
```

## Running the Project

Use two terminals. Both commands must be run from the project root.

### Terminal 1: Start the backend

```powershell
npm run api
```

The backend reads configuration from `.env`. With the example configuration, it listens on:

```text
http://localhost:5000
```

The backend prints the following messages when it starts successfully:

```text
Database connection successfully!
TMC backend listening on http://localhost:5000
```

### Terminal 2: Start the frontend

```powershell
npm run dev
```

Vite starts the frontend development server. The default address is:

```text
http://localhost:5173
```

Open that address in a web browser.

The Vite development server proxies requests starting with `/api` to the backend port configured in `.env`. If you change `PORT`, restart both `npm run api` and `npm run dev` so the proxy uses the new port.

## Login Flow

1. The user enters a username and password on `/login`.
2. The frontend sends a request to `POST /api/auth/login`.
3. The backend queries `"user".test_account` using parameterized SQL.
4. If the credentials are valid, the backend returns the account ID, username, and role.
5. The frontend stores the session in local storage.
6. The frontend redirects to the dashboard matching the role:
   - `employee` to `/employee/dashboard`
   - `admin` to `/admin/dashboard`
7. If the credentials are invalid, the backend returns `401 INVALID_CREDENTIALS` and the login page displays an error.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Vite frontend development server. |
| `npm run api` | Starts the backend with Node.js watch mode. |
| `npm run build` | Type-checks the TypeScript projects and builds the frontend. |
| `npm run lint` | Runs oxlint on the project. |
| `npm run preview` | Previews the frontend production build. |

Note: the current working tree does not contain the backend `attendance` and `report` module implementations, but the legacy HR/Payroll adapters still import their types. Because of this, the backend TypeScript step of `npm run build` may fail. The development commands `npm run dev` and `npm run api` are not affected.

## API Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check endpoint. |
| `POST` | `/api/auth/login` | Validates credentials against `"user".test_account`. |

### Login Request

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "username": "employee01",
  "password": "Employee123!"
}
```

### Successful Login Response

```json
{
  "data": {
    "user": {
      "id": "2",
      "username": "employee01",
      "role": "employee"
    }
  }
}
```

### Invalid Login Response

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password."
  }
}
```

## Project Structure

The tree below reflects the current repository structure, including the administrator Management page and its styles. Generated or local-only directories such as `.git/`, `node_modules/`, and `dist/` are omitted.

```text
TMC_System/
├── public/
│   └── favicon.svg
├── src/
│   ├── back/
│   │   └── package.json
│   ├── backend/
│   │   ├── config/
│   │   │   └── env.ts
│   │   ├── infrastructure/
│   │   │   └── external/
│   │   │       └── hr-payroll/
│   │   │           ├── hr-payroll-http.gateway.ts
│   │   │           └── logging-hr-payroll.gateway.ts
│   │   ├── modules/
│   │   │   ├── attendance/              # currently empty
│   │   │   ├── report/                  # currently empty
│   │   │   ├── role/                    # currently empty
│   │   │   └── user/
│   │   │       ├── controller/
│   │   │       │   └── auth.ts
│   │   │       ├── domain/
│   │   │       │   └── auth-user.ts
│   │   │       ├── repository/
│   │   │       │   ├── auth.repository.ts
│   │   │       │   └── postgres-auth.repository.ts
│   │   │       ├── routes/
│   │   │       │   └── auth.routes.ts
│   │   │       └── service/
│   │   │           └── auth.service.ts
│   │   ├── shared/
│   │   │   ├── errors/
│   │   │   │   └── app-error.ts
│   │   │   └── http/
│   │   │       ├── http-server.ts
│   │   │       ├── http.types.ts
│   │   │       └── parsers.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── database/
│   │   ├── config.ts
│   │   └── TMC_db.sql
│   └── frontend/
│       ├── components/
│       │   ├── attendance/
│       │   │   └── AttendanceTable.tsx
│       │   ├── common/
│       │   │   ├── AttendanceStatusTag.tsx
│       │   │   ├── BrandLogo.tsx
│       │   │   ├── ConfirmModal.tsx
│       │   │   ├── EmptyState.tsx
│       │   │   ├── PageLoading.tsx
│       │   │   ├── QRCodeModal.tsx
│       │   │   └── StatCard.tsx
│       │   ├── dashboard/
│       │   │   └── AttendanceTrendChart.tsx
│       │   ├── layout/
│       │   │   ├── AppHeader.tsx
│       │   │   ├── AppLayout.tsx
│       │   │   ├── AuthLayout.tsx
│       │   │   ├── BreadcrumbHeader.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   └── UserAvatarDropdown.tsx
│       │   └── profile/
│       │       ├── EditProfileModal.tsx
│       │       └── ProfileCard.tsx
│       ├── context/
│       │   ├── AuthContext.tsx
│       │   └── authContextValue.ts
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   └── useClock.ts
│       ├── layouts/
│       │   ├── AdminLayout.tsx
│       │   └── EmployeeLayout.tsx
│       ├── mocks/
│       │   ├── attendance.ts
│       │   ├── statistics.ts
│       │   └── users.ts
│       ├── pages/
│       │   ├── admin/
│       │   │   ├── AdminDashboardPage.tsx
│       │   │   ├── AdminProfilePage.tsx
│       │   │   ├── AttendanceStatisticsPage.tsx
│       │   │   └── ManagementPage.tsx       # /admin/management
│       │   ├── auth/
│       │   │   ├── ForgotPasswordPage.tsx
│       │   │   ├── LoginPage.tsx
│       │   │   └── SignUpPage.tsx
│       │   ├── employee/
│       │   │   ├── EmployeeDashboardPage.tsx
│       │   │   └── EmployeeProfilePage.tsx
│       │   ├── kiosk/
│       │   │   └── KioskPage.tsx
│       │   └── NotFoundPage.tsx
│       ├── routes/
│       │   ├── AppRoutes.tsx
│       │   └── ProtectedRoute.tsx
│       ├── services/
│       │   └── auth.api.ts
│       ├── styles/
│       │   ├── abstracts/
│       │   │   ├── _mixins.scss
│       │   │   └── _variables.scss
│       │   ├── base/
│       │   │   ├── _antd-overrides.scss
│       │   │   ├── _reset.scss
│       │   │   └── _typography.scss
│       │   ├── components/
│       │   │   ├── _attendance.scss
│       │   │   ├── _auth.scss
│       │   │   ├── _common.scss
│       │   │   ├── _dashboard.scss
│       │   │   ├── _kiosk.scss
│       │   │   ├── _management.scss
│       │   │   ├── _profile.scss
│       │   │   └── _statistics.scss
│       │   ├── layouts/
│       │   │   ├── _app-layout.scss
│       │   │   └── _auth-layout.scss
│       │   └── main.scss
│       ├── types/
│       │   ├── attendance.ts
│       │   ├── auth.ts
│       │   └── navigation.ts
│       ├── utils/
│       │   ├── async.ts
│       │   ├── attendance.ts
│       │   ├── csv.ts
│       │   ├── date.ts
│       │   └── user.ts
│       ├── App.tsx
│       ├── main.tsx
│       └── theme.ts
├── .env
├── .gitignore
├── .oxlintrc.json
├── Implements.md
├── README.md
├── UI_plan.md
├── UI_requirements.md
├── index.html
├── package-lock.json
├── package.json
├── tsconfig.app.json
├── tsconfig.backend.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Application Structure

### Backend

The backend is organized by modules. The user module contains the authentication flow:

- `controller/auth.ts` parses HTTP requests and formats responses.
- `service/auth.service.ts` implements the login use case and role resolution.
- `domain/auth-user.ts` defines authentication user types and role mapping.
- `repository/auth.repository.ts` defines the persistence contract.
- `repository/postgres-auth.repository.ts` implements the SQL query against `"user".test_account`.
- `routes/auth.routes.ts` registers the login endpoint.
- `app.ts` is the composition root that wires the repository, service, controller, and routes.
- `shared/http` contains the small HTTP server and request parsing helpers.
- `shared/errors` contains application errors with HTTP status codes.

### Frontend

- `pages/` contains the screens for authentication, employees, administrators, and the kiosk.
- `pages/admin/ManagementPage.tsx` provides employee account management with view, update, and delete modals.
- `components/` contains reusable layout, table, form, dashboard, and modal components.
- `context/AuthContext.tsx` manages the current user session and calls the login API.
- `services/auth.api.ts` sends login requests to the backend.
- `routes/` contains route definitions and role-based route protection.
- `mocks/` contains local attendance, statistics, and user data used by the current UI.
- `styles/` contains all SCSS styling.
- `types/` contains shared frontend TypeScript types.
- `utils/` contains date, CSV, attendance, and user presentation helpers.

### Database

- `src/database/config.ts` creates the PostgreSQL connection pool and loads `.env`.
- `src/database/TMC_db.sql` contains the schema, tables, and seed accounts.

## Authentication Notes

- Login credentials are verified against `"user".test_account`.
- Passwords are currently stored as plain text in the demo table.
- No JWT or server-side session is used.
- The frontend keeps the logged-in user in local storage for routing and page state.
- This authentication implementation is intended for coursework and demonstration purposes, not production use.
