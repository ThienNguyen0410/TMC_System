# UI Implementation Plan and Results

## 1. Project Overview

Built the complete frontend UI for the TMC Employee Attendance Management System described in `UI_requirements.md`. The application demonstrates:

- Public authentication pages (Sign In, Sign Up, Forgot Password).
- A full-screen attendance kiosk with simulated QR scanning and result states.
- Employee dashboard, attendance history, personal QR code, and profile management.
- Administrator dashboard, attendance analytics, profile management, and company-wide attendance records.
- Role-based navigation and route protection using local mock authentication.

The existing backend under `src/backend` was not modified. The UI makes no API calls, does not use a database, and does not implement real authentication or QR decoding.

## 2. Technical Stack and Decisions

| Area | Implementation |
|---|---|
| Framework | React 19 + TypeScript + Vite |
| UI library | Ant Design 6 |
| Routing | React Router 7 |
| Styling | SCSS with shared variables, mixins, and partials |
| Icons | `@ant-design/icons` |
| QR codes | `qrcode.react` (`QRCodeCanvas`) |
| Dates | `dayjs` |
| Mock persistence | Browser `localStorage` |
| Linting | `oxlint` |
| Build | `tsc -b && vite build` |

All frontend source is organized under `src/frontend`, matching the scope of the existing `tsconfig.app.json`.

## 3. Implemented Structure

```text
src/frontend/
├── components/
│   ├── attendance/AttendanceTable.tsx
│   ├── common/ (BrandLogo, StatCard, EmptyState, PageLoading,
│   │            AttendanceStatusTag, ConfirmModal, QRCodeModal)
│   ├── dashboard/AttendanceTrendChart.tsx
│   ├── layout/ (AppLayout, AppHeader, Sidebar, BreadcrumbHeader,
│   │             UserAvatarDropdown, AuthLayout)
│   └── profile/ (ProfileCard, EditProfileModal)
├── context/ (AuthContext.tsx, authContextValue.ts)
├── hooks/ (useAuth.ts, useClock.ts)
├── layouts/ (EmployeeLayout.tsx, AdminLayout.tsx)
├── mocks/ (users.ts, attendance.ts, statistics.ts)
├── pages/
│   ├── auth/ (LoginPage, SignUpPage, ForgotPasswordPage)
│   ├── employee/ (EmployeeDashboardPage, EmployeeProfilePage)
│   ├── admin/ (AdminDashboardPage, AdminProfilePage, AttendanceStatisticsPage)
│   └── kiosk/KioskPage.tsx
├── routes/ (AppRoutes.tsx, ProtectedRoute.tsx)
├── styles/ (main.scss and modular SCSS partials)
├── types/ (auth.ts, attendance.ts, navigation.ts)
├── utils/ (attendance.ts, date.ts, user.ts, async.ts, csv.ts)
├── App.tsx
├── main.tsx
└── theme.ts
```

## 4. Routing and Access Control

| Route | Access | Result |
|---|---|---|
| `/` | Public | Redirects to the role dashboard or `/login` |
| `/login` | Public | Sign In page |
| `/signup` | Public | Sign Up page |
| `/forgot-password` | Public | Forgot Password page |
| `/kiosk` | Public | Full-screen attendance kiosk |
| `/employee/dashboard` | Employee | Employee dashboard and attendance history |
| `/employee/profile` | Employee | Employee profile |
| `/admin/dashboard` | Administrator | Administrator overview |
| `/admin/statistics` | Administrator | Company-wide attendance statistics |
| `/admin/profile` | Administrator | Administrator profile |
| `*` | Public | Not Found page |

- `ProtectedRoute` sends unauthenticated users to `/login`.
- Users who attempt a route for the other role are redirected to their own dashboard.
- Route-level code splitting uses `React.lazy` and `Suspense` with a shared loading screen.
- Sign Out clears the mock session and returns to `/login` after an Ant Design confirmation modal.

## 5. Mock Data and Authentication

### Demo accounts

| Role | Username | Password | Full Name | Employee ID |
|---|---|---|---|---|
| Employee | `employee01` | `Employee123!` | Nguyen Van An | `EMP-0001` |
| Administrator | `admin01` | `Admin123!` | Tran Thi Binh | `ADM-0001` |
| Employee | `employee02`–`employee08` | `Employee123!` | Additional demo employees | `EMP-0002`–`EMP-0008` |

The employee account details match the required full name, email, phone number, and date of birth from the brief.

### Attendance data

- Eight employee accounts and one administrator account are defined in `mocks/users.ts`.
- Attendance records are generated for the last 30 calendar days, excluding weekends except the current day.
- Eight employees × 21 weekday records produces 168 demo attendance records.
- Status values are `present`, `late`, `absent`, and `incomplete`.
- Deterministic per-employee status patterns produce a realistic mix instead of a biased pseudo-random distribution.
- The current day has a fixed demonstration plan: 4 present, 2 late, 1 absent, 1 incomplete.
- Check-in/check-out times and working hours are generated from mock values.
- Summary statistics and the seven-day trend are calculated from the mock records in `mocks/statistics.ts`.

### Mock persistence

| localStorage key | Purpose |
|---|---|
| `tmc.mock.session` | Current mock user ID |
| `tmc.mock.registered-users` | Accounts created through the Sign Up form |
| `tmc.mock.profile-overrides` | Locally edited profile fields |

On a successful sign-up, a new employee account receives the next available employee ID, a unique mock QR value, a department of `General`, and is signed in automatically.

## 6. Shared SCSS Design System

Custom styling uses SCSS only, with no Tailwind or CSS-in-JS styling for layout/custom presentation.

- Palette: navy `#0b1f3f`, primary blue `#1d4ed8`, page background `#f4f7fb`, surface white, slate text, green success, amber warning, and red danger.
- Status colors are consistent across tags, cards, progress elements, and charts.
- Ant Design theme tokens centralize primary colors, surfaces, borders, typography, control heights, and component-specific colors in `theme.ts`.
- Reusable variables cover colors, spacing, typography, breakpoints, radii, transitions, and shadows.
- Mixins cover responsive breakpoints, truncation, focus rings, and common layout patterns.
- Partials are split into abstracts, base, components, and layouts under `styles/`.
- Responsive behavior covers desktop, tablet, and mobile:
  - Collapsible sidebar with a mobile header trigger.
  - Responsive grids and form rows.
  - Horizontally scrollable data tables on small screens.
  - Wrapped card headers to prevent subtitle clipping.
  - Full-screen kiosk layout optimized for touch use.

## 7. Page Implementation Results

### 7.1 Login Page

- Username and password fields with required and minimum-length validation.
- Simulated loading state and invalid-credential error alert.
- Demo employee and administrator shortcuts that prefill credentials.
- Links to Sign Up and Forgot Password.
- Role-based redirect after successful sign-in.
- Responsive split-screen authentication layout that becomes a single column on mobile.

### 7.2 Sign Up Page

- Fields: Full Name, Username, Phone Number, Email, Date of Birth, Password, Confirm Password.
- Required-field validation, email format validation, Vietnamese phone validation, username pattern validation, password strength validation, password confirmation, and no-future-date validation.
- Duplicate username and duplicate email errors are assigned to the relevant form field.
- Successful registration displays an Ant Design success modal containing the generated QR code.
- “Go to my dashboard” signs in the new employee and automatically opens their QR code on the employee dashboard.
- Registered accounts and their QR values persist in browser storage.

### 7.3 Forgot Password Page

- Email field with required/email-format validation.
- Simulated loading and success result for registered demo emails.
- Simulated “No account found” error for unknown emails.
- Buttons to return to Sign In or try another email.
- No email is sent and no password is changed.

### 7.4 Employee Dashboard

- Shared employee layout with sidebar, breadcrumb/title header, greeting, avatar menu, and main content area.
- Personalized hero greeting and employee metadata.
- Summary cards for present days, late arrivals, absent days, total working hours, and incomplete records in the hero.
- Attendance table with date, check-in, check-out, status, and working hours.
- Search by date/time/status, status filter, date range filter, reset, sortable columns, pagination, and empty state.
- **Show Attendance QR Code** button and secondary **QR code** button.
- QR modal displays the employee name, username, employee ID, department, and a downloadable QR image.
- Empty-state alert and guidance for newly registered employees without attendance history.

### 7.5 Employee Profile

- Avatar, full name, username, email, phone number, date of birth, role, department, employee ID, and account status.
- **Edit Profile** modal with validation for full name, email, phone, and date of birth.
- Save and Cancel actions; saved values update the profile and persist in localStorage.
- Employee-only Attendance QR access from the profile summary.

### 7.6 Administrator Dashboard

- Administrator layout with distinct navigation.
- Summary cards: total employees, present today, late today, and absent today.
- Seven-day attendance trend chart implemented with SCSS bars and a legend for all four statuses.
- Circular attendance-rate indicator with status breakdown for the current day.
- Recent attendance activity table with navigation to all records.
- Header greeting, breadcrumb, avatar dropdown, and Kiosk entry point.

### 7.7 Administrator Profile

- Reuses the profile presentation and edit modal.
- Displays administrator role, department, employee ID, contact information, and account status.
- Attendance QR action is hidden for administrators.

### 7.8 Attendance Statistics

- Summary cards for total employees, present records, late arrivals, and absences; the last three update with the current filters.
- Company-wide table with employee ID, full name, username, date, check-in, check-out, status, and working hours.
- Search by name, username, employee ID, or status.
- Status filter, date-range filter, reset, sortable columns, and pagination.
- Empty state when no records match.
- Client-side CSV export of the currently filtered records, with a success message.
- Responsive summary grid and horizontally scrollable table.

### 7.9 Kiosk Page

- Full-screen, touch-friendly kiosk layout with company branding and a live clock.
- Simulated camera preview with HUD labels, scanning frame, QR placeholder, animated scan line, and scanning status.
- Success state with employee name, username, employee ID, status, date, time, and “Scan next employee”.
- Invalid QR, scan failure, camera permission denied, and camera unavailable states, each with a clear recovery action.
- Demo controls for triggering every scanning result without keyboard input.
- Role-aware exit link: “Back to app” for signed-in users, otherwise “Exit kiosk”.
- No real camera access or QR decoding; all scanning is simulated in the browser.

### 7.10 Not Found Page

- Styled Ant Design result page with navigation back to the application.

## 8. Reusable Components

- `AppLayout`, `EmployeeLayout`, `AdminLayout`
- `Sidebar`, `AppHeader`, `BreadcrumbHeader`, `UserAvatarDropdown`, `AuthLayout`
- `AttendanceTable`, `AttendanceStatusTag`
- `StatCard`, `QRCodeModal`, `ConfirmModal`, `EmptyState`, `PageLoading`
- `ProfileCard`, `EditProfileModal`
- `AttendanceTrendChart`, `BrandLogo`

Ant Design supplies tables, forms, inputs, date pickers, selects, modals, dropdowns, cards, tags, avatars, progress, results, alerts, messages, and confirmations.

## 9. Implemented Interactions

- Role-based sign-in, sign-up, sign-out, and route protection.
- Form validation and simulated loading/error/success feedback.
- Profile editing with save persistence.
- Avatar dropdown with View Profile and Sign Out confirmation.
- Table search, sorting, status/date filters, reset, pagination, and empty states.
- Live summary recalculation from filtered attendance records.
- Client-side CSV export.
- QR code display, download, uniqueness, and persistence for registered accounts.
- Kiosk result-state transitions and recovery actions.
- Responsive sidebar navigation and mobile-friendly layouts.

## 10. Implementation Order and Status

| Step | Status |
|---|---|
| Inspect project structure and dependencies | Complete |
| Set up shared SCSS, theme, and global styles | Complete |
| Implement mock accounts, attendance, QR data, and statistics | Complete |
| Create shared layouts and role-based navigation | Complete |
| Build Login, Sign Up, and Forgot Password | Complete |
| Build Employee Dashboard with table and QR modal | Complete |
| Build Employee Profile | Complete |
| Build Admin Dashboard | Complete |
| Build Admin Profile | Complete |
| Build Attendance Statistics | Complete |
| Build Kiosk and all result states | Complete |
| Connect all routes and guards | Complete |
| Test sorting, searching, filtering, modals, dropdowns, validation, and auth | Complete |
| Verify responsive behavior and visual consistency | Complete |
| Update `UI_plan.md` with plan and results | Complete |

## 11. Verification Results

### Commands

- `npm run lint` — passed with zero warnings or errors.
- `npm run build` — passed (`tsc -b` and Vite production build).

### Functional checks

- Invalid login displays the expected error alert.
- Employee sign-in redirects to `/employee/dashboard`; admin sign-in redirects to `/admin/dashboard`.
- An employee attempting `/admin/dashboard` is redirected back to the employee dashboard.
- Profile edits save and persist after reload.
- Avatar dropdown shows View Profile and Sign Out; sign-out confirmation returns to `/login`.
- Sign-up creates a new employee account, displays the success modal and QR code, opens the dashboard QR, and survives a page reload.
- Status filter for Late displays 34 of 168 records and recalculates summary cards.
- Searching `EMP-0001` displays 21 of 168 records.
- CSV export creates a filtered attendance CSV file locally.
- Kiosk scanning transitions through success, invalid QR, scan failure, camera denied, and camera unavailable states.
- Mobile employee dashboard has no page-level horizontal overflow; the mobile header trigger is available and the table scrolls horizontally where necessary.
- Mobile administrator statistics preserves summary cards and provides horizontal table scrolling.
- Final browser verification produced zero console errors, page errors, or failed requests.

### Visual checks

Desktop and mobile screenshots were reviewed for:

- Login, sign-up, forgot-password, and their validation/result states.
- Employee dashboard, QR modal, attendance table, profile, and edit modal.
- Admin dashboard, statistics, filtered statistics, and profile.
- Kiosk scanning, success, and invalid states.
- Mobile login, employee dashboard, and administrator statistics.

## 12. Known Limitations

- Authentication and role-based access control are frontend simulations using mock accounts and localStorage.
- Credentials are not secure and must not be used for a real system.
- The kiosk uses a simulated scanner; it does not access a real camera or decode QR codes.
- Kiosk scans only display feedback; they do not create persistent attendance records in the mock dataset.
- Attendance records are generated at page load and are not stored in localStorage.
- Newly registered employees have no attendance history until demo data is added.
- Profile edits and registered accounts persist only in the current browser.
- Forgot Password does not send email or change a password.
- CSV export is generated entirely in the browser.
- Demo dates are relative to the current date, so the dataset shifts over time.
- No backend, database, API, JWT, or server session is used.

## 13. Running the Demo

```bash
npm install
npm run dev
```

Open the URL printed by Vite, then use:

- Employee: `employee01` / `Employee123!`
- Administrator: `admin01` / `Admin123!`
- Kiosk: `/kiosk` (available without signing in)

Backend commands are not required and were not used.
