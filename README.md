# TMC System

TMC System is a modular monolith for employee attendance management. It records attendance, synchronizes recorded attendance with an existing external HR/Payroll system, and generates attendance statistics on demand when a user opens the Statistics page.

The application is one deployable unit with clear internal module boundaries. The backend does not call another service for its own business operations; modules communicate through explicit application contracts, while the external HR/Payroll system is accessed through an adapter behind a port.

## Architecture Overview

The source code is organized into three top-level areas under `src/`:

- `frontend`: React and TypeScript user interface.
- `backend`: modular monolith application and HTTP API.
- `database`: SQL schema, migrations, seed data, and reporting queries.

The backend follows a module-first layout. Each business module contains its own controller, service, domain model, repository contract, routes, and shared types. Technical concerns that are used by multiple modules live in `shared`, while concrete adapters for databases and external systems live in `infrastructure`.

The main principles are:

- Controllers handle HTTP input and output only.
- Services coordinate use cases and transactions.
- Domain models contain business validation and business behavior.
- Repository interfaces are owned by the module that needs them.
- Repository implementations and external clients are infrastructure adapters.
- The report module generates statistics on demand instead of running continuously.

## System Modules

### Attendance Module

The attendance module records attendance for an employee and pushes the recorded data to the existing HR/Payroll system.

The module contains four core classes:

| Class | File | Responsibility |
| --- | --- | --- |
| `AttendanceController` | `src/backend/modules/attendance/attendance.controller.ts` | Parses HTTP requests, validates request shape, calls the service, and formats HTTP responses. |
| `AttendanceService` | `src/backend/modules/attendance/attendance.service.ts` | Orchestrates the attendance use case: create the domain record, check duplicates, persist it, and synchronize it with HR/Payroll. |
| `AttendanceDomain` | `src/backend/modules/attendance/attendance.domain.ts` | Aggregate root for one attendance record. Validates required fields, date-time order, status values, creates the record ID, and controls synchronization state. |
| `AttendanceRepository` | `src/backend/modules/attendance/attendance.repository.ts` | Persistence contract used by the service. Concrete implementations live under `infrastructure/persistence`. |

The attendance record flow is:

1. The user submits the attendance form in `AttendanceRecordPage`.
2. The frontend sends `POST /api/attendance/records`.
3. `AttendanceController` parses and validates the request body.
4. `AttendanceService` creates an `AttendanceDomain` record and checks for an existing record for the same employee and work date.
5. `AttendanceRepository` stores the new record.
6. `AttendanceService` sends the record to the external HR/Payroll system through the `HRPayrollPort`.
7. When HR/Payroll accepts the record, the service marks the record as synchronized.
8. The controller returns the recorded attendance to the frontend.

If the external HR/Payroll call fails, the attendance record remains stored and unsynchronized. The failure is logged so that a retry mechanism can be added without losing the original attendance event. In production, this boundary should be implemented with a transactional outbox and a retry worker.

### Report Module

The report module is activated only when a user accesses the statistics page. It does not run as a background scheduler and it does not precompute reports during attendance recording.

The report flow is:

1. The user opens the Statistics page, which mounts `AttendanceReportPage`.
2. The page calls `GET /api/reports/attendance` for the selected period.
3. `ReportController` parses the period and optional department filter.
4. `ReportService` asks `ReportRepository` for attendance source rows in that period.
5. `ReportDomain` validates the period and calculates totals, status counts, attendance rate, daily breakdown, and department breakdown.
6. The controller returns the generated report to the frontend.

The module mirrors the attendance layering:

| Class | File | Responsibility |
| --- | --- | --- |
| `ReportController` | `src/backend/modules/report/report.controller.ts` | Parses report query parameters and returns the report response. |
| `ReportService` | `src/backend/modules/report/report.service.ts` | Loads source rows and invokes report generation on demand. |
| `ReportDomain` | `src/backend/modules/report/report.domain.ts` | Validates the period and calculates all attendance statistics. |
| `ReportRepository` | `src/backend/modules/report/report.repository.ts` | Read-model contract for attendance data used by reports. |

The report read model is intentionally separate from the attendance write model. This keeps statistics generation from depending on the internal behavior of the attendance service and allows a future SQL implementation to use optimized reporting queries.

### Frontend

The frontend only presents data and calls the backend API. It does not duplicate attendance or reporting business rules.

- `pages`: top-level screens. `AttendanceRecordPage` records attendance and lists recent records. `AttendanceReportPage` loads statistics when the page is opened.
- `components`: reusable UI grouped by concern. Attendance components contain the form, record table, and status badge. Report components contain summary cards, the daily trend chart, and the department breakdown table. Layout and common components are shared across pages.
- `services`: HTTP clients. `api-client.ts` centralizes fetch behavior and error handling, while `attendance.api.ts` and `report.api.ts` expose module-specific API calls.
- `types`: frontend contracts that match backend DTOs.
- `utils`: small presentation helpers such as date formatting.

### External HR/Payroll Integration

The external system is represented by the `HRPayrollPort` interface in the attendance module. The service depends on the port, not on a concrete HTTP client. Two adapters are provided:

- `HttpHRPayrollGateway`: sends attendance records to the external system through HTTP. It is used when `HR_PAYROLL_BASE_URL` is configured.
- `LoggingHRPayrollGateway`: logs the synchronization attempt for local development. It is used when no external URL is configured.

This keeps the external dependency at the infrastructure edge and prevents external API details from leaking into the domain or application service.

### Shared and Infrastructure

- `shared/errors`: application error types with HTTP status codes.
- `shared/http`: a small HTTP server, request/response contracts, and request body parsing helpers. The current scaffold uses Node's built-in HTTP server so the backend has no framework dependency.
- `infrastructure/persistence`: in-memory repository implementations and a shared in-memory database for local development.
- `infrastructure/external/hr-payroll`: adapters for the existing HR/Payroll system.

The composition root in `src/backend/app.ts` wires repositories, services, controllers, routes, and the external HR/Payroll adapter. `src/backend/server.ts` starts the HTTP server.

### Database

The `src/database` directory defines the target relational persistence model:

- `migrations/001_create_attendance_records.sql`: attendance table, uniqueness rule for one record per employee and work date, foreign-key-free employee and department identifiers, synchronization timestamp, and reporting indexes.
- `seeds/001_attendance_seed.sql`: sample attendance rows across multiple employees, departments, dates, and statuses.
- `queries/attendance_report.sql`: SQL aggregation for department-level attendance statistics.

The local backend currently uses in-memory repositories. The SQL files document the intended production persistence contract and can be used to replace the in-memory adapters without changing the service or domain layers.

## Source Code Organization

```text
src/
├── frontend/
│   ├── components/
│   │   ├── attendance/
│   │   │   ├── AttendanceForm.tsx
│   │   │   ├── AttendanceRecordTable.tsx
│   │   │   └── AttendanceStatusBadge.tsx
│   │   ├── common/
│   │   │   └── Card.tsx
│   │   ├── layout/
│   │   │   └── AppLayout.tsx
│   │   └── report/
│   │       ├── AttendanceSummaryCards.tsx
│   │       ├── AttendanceTrendChart.tsx
│   │       └── DepartmentBreakdownTable.tsx
│   ├── pages/
│   │   ├── attendance/
│   │   │   └── AttendanceRecordPage.tsx
│   │   └── report/
│   │       └── AttendanceReportPage.tsx
│   ├── services/
│   │   ├── api-client.ts
│   │   ├── attendance.api.ts
│   │   └── report.api.ts
│   ├── types/
│   │   ├── attendance.ts
│   │   ├── navigation.ts
│   │   └── report.ts
│   ├── utils/
│   │   └── date.ts
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── backend/
│   ├── config/
│   │   └── env.ts
│   ├── infrastructure/
│   │   ├── external/
│   │   │   └── hr-payroll/
│   │   │       ├── hr-payroll-http.gateway.ts
│   │   │       └── logging-hr-payroll.gateway.ts
│   │   └── persistence/
│   │       ├── in-memory-attendance.repository.ts
│   │       ├── in-memory-database.ts
│   │       └── in-memory-report.repository.ts
│   ├── modules/
│   │   ├── attendance/
│   │   │   ├── attendance.controller.ts
│   │   │   ├── attendance.domain.ts
│   │   │   ├── attendance.ports.ts
│   │   │   ├── attendance.repository.ts
│   │   │   ├── attendance.routes.ts
│   │   │   ├── attendance.service.ts
│   │   │   └── attendance.types.ts
│   │   └── report/
│   │       ├── report.controller.ts
│   │       ├── report.domain.ts
│   │       ├── report.repository.ts
│   │       ├── report.routes.ts
│   │       ├── report.service.ts
│   │       └── report.types.ts
│   ├── shared/
│   │   ├── errors/
│   │   │   └── app-error.ts
│   │   └── http/
│   │       ├── http-server.ts
│   │       ├── http.types.ts
│   │       └── parsers.ts
│   ├── app.ts
│   └── server.ts
└── database/
    ├── migrations/
    │   └── 001_create_attendance_records.sql
    ├── queries/
    │   └── attendance_report.sql
    └── seeds/
        └── 001_attendance_seed.sql
```

## API Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check. |
| `POST` | `/api/attendance/records` | Record attendance and synchronize it with HR/Payroll. |
| `GET` | `/api/attendance/records` | List attendance records. Supports `employeeId`, `from`, and `to` query parameters. |
| `GET` | `/api/reports/attendance` | Generate attendance statistics on demand. Supports `from`, `to`, and `departmentId` query parameters. |

Example attendance request:

```json
{
  "employeeId": "EMP001",
  "employeeName": "Alice Nguyen",
  "departmentId": "DEPT-IT",
  "workDate": "2026-10-24",
  "checkInAt": "2026-10-24T08:00:00+07:00",
  "checkOutAt": "2026-10-24T17:00:00+07:00",
  "status": "PRESENT",
  "note": "On time"
}
```

## Getting Started

Requirements:

- Node.js 22 or newer.
- npm.

Install dependencies:

```bash
npm install
```

Start the backend:

```bash
npm run dev:backend
```

The backend listens on `http://localhost:3001` by default.

Start the frontend in a separate terminal:

```bash
npm run dev
```

The Vite development server proxies `/api` requests to `http://localhost:3001`.

Build and lint:

```bash
npm run build
npm run lint
```

## Environment Variables

| Variable | Used by | Description |
| --- | --- | --- |
| `PORT` | Backend | HTTP port. Defaults to `3001`. |
| `HR_PAYROLL_BASE_URL` | Backend | Base URL of the existing HR/Payroll system. When empty, the logging adapter is used. |
| `HR_PAYROLL_API_KEY` | Backend | Bearer token sent to the HR/Payroll system. |
| `VITE_API_BASE_URL` | Frontend | Optional API base URL. Leave empty to use the Vite development proxy. |

## Design Rules for Future Changes

- Keep business rules in domain classes, not in controllers or React components.
- Add new use cases to services and expose them through controllers and routes.
- Keep module-to-module access limited to public types or explicit application contracts.
- Add new external integrations as ports in the owning module and adapters in `infrastructure`.
- Replace in-memory repositories with SQL repositories before production use.
- Add authentication, authorization, audit logging, and observability before production use.
- Replace the direct HR/Payroll synchronization call with a transactional outbox and retry worker when delivery guarantees become critical.
