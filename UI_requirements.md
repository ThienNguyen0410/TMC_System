# UI Development Plan — Employee Attendance Management System

## 1. Project Overview

Build the frontend UI for an Employee Attendance Management System that allows employees to record attendance through QR code scanning and enables administrators to monitor attendance statistics.

The application includes public authentication pages, a kiosk attendance page, employee pages, and administrator pages.

### Technical Requirements

- **Frontend:** ReactJS with TypeScript and Vite.
- **UI Library:** Ant Design (AntD).
- **Styling:** SCSS.
- **Routing:** React Router.
- **Data:** Local mock data for testing and demonstrating UI functionality.
- **Scope:** Frontend UI development only.

### Important Constraints

- Do not implement any backend functionality.
- Do not create or modify a database.
- Do not make API calls or integrate with backend services.
- Use mock data to simulate users, attendance records, profiles, and administrator statistics.
- Implement frontend interactions wherever possible, including navigation, sorting, searching, filtering, dropdown menus, modals, and form validation.
- Use Ant Design components for tables, forms, modals, popups, dropdowns, tabs, and other common UI elements.
- Use SCSS for all custom styling.
- Record the complete UI implementation plan and the results of the implementation in a file named `UI_plan.md`.

---

## 2. Application Pages

### 2.1. Kiosk Page

The Kiosk page acts as a camera-enabled attendance terminal located at the company entrance. Employees use this page to scan their personal QR codes and record their attendance.

**UI requirements:**

- Display a large camera preview area.
- Provide clear instructions explaining how to position a QR code in front of the camera.
- Include a scanning indicator or visual frame to guide users.
- Display appropriate feedback states, such as:
  - Attendance recorded successfully.
  - Invalid QR code.
  - QR code scanning failed.
  - Camera permission denied.
  - Camera unavailable.
- Provide a clear way to return to the scanning state after displaying a result.
- Use a full-screen, touch-friendly layout suitable for a kiosk monitor.
- Display the company name or logo area at the top of the page.
- Keep the interface simple and easy to use without requiring keyboard input.

**Implementation notes:**

Since this project focuses on UI development, use simulated scanning results or a mock scanning interface. Do not implement attendance recording on the backend.

If a QR scanning library is used, it may access the camera locally in the browser. However, no API requests should be made.

### 2.2. Login Page

Create an authentication page that supports Sign In, Sign Up, and Forgot Password.

Use Ant Design forms and inputs, with clear validation messages and responsive layouts.

#### Sign In

Provide the following fields:

- Username
- Password

Include:

- Sign In button.
- Link to the Sign Up form.
- Link to the Forgot Password page.
- Loading and error states simulated on the frontend.
- Basic form validation.

For demonstration purposes, allow users to sign in using predefined mock accounts for both the employee and administrator roles.

After successful mock authentication, redirect users according to their roles:

- Employee → Employee Dashboard.
- Admin → Admin Dashboard.

#### Sign Up

Provide the following fields:

- Full Name
- Username
- Password
- Phone Number
- Email
- Date of Birth

Include:

- A Sign Up button.
- A link back to Sign In.
- Required-field validation.
- Email format validation.
- Basic password validation.
- Phone number validation.
- A confirmation or success modal after a simulated successful registration.

After a successful mock registration, simulate the creation of a personal attendance QR code and display it in the employee dashboard.

The QR code must be generated or represented entirely on the frontend using mock data. Do not save it to a database.

#### Forgot Password

Provide the following elements:

- Email input.
- Submit button.
- Link back to Sign In.
- Validation for required fields and email format.
- A success or error message simulated on the frontend.

Do not implement real password recovery or send emails.

---

## 3. Employee Pages

### 3.1. Employee Dashboard

The Employee Dashboard is the main page for employees to view their attendance records and access their personal QR code.

#### Page Layout

Create a shared dashboard layout consisting of:

- A sidebar for navigation.
- A top header or breadcrumb area.
- A main content area.
- A user avatar menu in the top-right corner.

The layout should be consistent across employee pages.

#### Header and Breadcrumb

- Display a breadcrumb that indicates the current page.
- Include a personalized greeting such as "Hello, {username}" in the header area.
- Display the employee's avatar on the right side.
- When the avatar is clicked, open an Ant Design Dropdown or Popover containing:
  - **View Profile:** Navigate to the employee profile page.
  - **Sign Out:** Display a confirmation modal if appropriate, then return to the Sign In page.

Use the logged-in mock user's information to populate the greeting and avatar.

#### Attendance Records

Display the employee's attendance history using an Ant Design Table.

Recommended columns:

- Date
- Check-in Time
- Check-out Time
- Attendance Status
- Working Hours

Use realistic mock records to demonstrate the interface.

**Table functionality:**

- Sort records by date and time.
- Search records using relevant fields.
- Filter records by attendance status or date where appropriate.
- Support pagination.
- Display an empty state when no records match the current search or filter.
- Use status tags to distinguish states such as Present, Late, Absent, and Incomplete.

All table interactions must operate on local mock data.

#### Personal QR Code

Provide a clearly visible button labeled **"View My QR Code"** or **"Show Attendance QR Code"**.

When clicked:

- Open an Ant Design Modal.
- Display the employee's personal QR code.
- Show the employee's name and username below or beside the QR code.
- Provide a Close button.
- Optionally provide a Download QR Code button if QR image generation is supported.

For a newly registered mock employee, simulate the creation of a unique QR code. The QR code should remain associated with that mock employee during the frontend demonstration.

Use local mock data or frontend state to simulate persistence. Do not implement database storage.

### 3.2. Employee Profile Page

The Employee Profile page displays the personal information associated with the logged-in employee.

**Information to display:**

- Avatar
- Full Name
- Username
- Email
- Phone Number
- Date of Birth
- Role

**UI requirements:**

- Display information in a clean card-based layout or a structured description list.
- Include an Edit Profile button.
- When clicked, allow the employee to edit their editable profile fields through an Ant Design Modal or form.
- Validate form inputs.
- Include Save and Cancel buttons.
- Update the displayed mock profile data after saving.

Do not implement backend profile updates.

---

## 4. Administrator Pages

Administrator pages should use a separate role-aware dashboard layout. Reuse common layout components where appropriate while keeping administrator navigation distinct from employee navigation.

### 4.1. Admin Dashboard

The Admin Dashboard provides an overview of the attendance system.

**Suggested dashboard elements:**

- Total Employees.
- Employees Present Today.
- Employees Late Today.
- Employees Absent Today.
- Recent Attendance Activity.

Display the summary statistics using Ant Design Cards and suitable visual elements.

Optionally, include charts to visualize attendance trends if a charting library is already available in the project. Otherwise, use Ant Design components and simple SCSS-based visualizations.

**UI requirements:**

- Use mock statistics and attendance records.
- Display a consistent header with a breadcrumb and administrator greeting.
- Show the administrator avatar in the top-right corner.
- Provide a dropdown menu containing:
  - View Profile.
  - Sign Out.
- Include navigation to the attendance statistics page.

All statistics must be calculated from, or represented by, local mock data rather than retrieved from a backend.

### 4.2. Admin Profile Page

The Admin Profile page displays the administrator's personal account information.

**Information to display:**

- Avatar
- Full Name
- Username
- Email
- Phone Number
- Date of Birth
- Role

**UI requirements:**

- Use a clean card-based layout or Ant Design Descriptions component.
- Include an Edit Profile button.
- Use an Ant Design Modal or form to edit profile information.
- Provide Save and Cancel buttons.
- Validate the form and update the local mock profile after saving.

Do not implement backend profile updates.

### 4.3. Employee Attendance Statistics Page

This page allows administrators to view and analyze attendance results across employees.

Use an Ant Design Table to display attendance records for all employees.

**Recommended columns:**

- Employee ID
- Full Name
- Username
- Date
- Check-in Time
- Check-out Time
- Attendance Status
- Working Hours

**Table functionality:**

- Search employees by name or username.
- Sort records by date, employee name, or attendance status.
- Filter by attendance status.
- Filter by date or date range.
- Support pagination.
- Display a clear empty state when no records match the selected criteria.
- Use colored Ant Design Tags to distinguish attendance statuses.

**Additional UI features:**

- Display summary cards above the table, such as total employees, present employees, late arrivals, and absences.
- Allow administrators to select a date or date range using Ant Design DatePicker or RangePicker.
- Optionally provide an Export button that generates a local CSV file from the currently displayed mock data.

The export feature is optional and should only be implemented if time permits.

All filtering, sorting, statistics, and export functionality must work with local mock data only.

---

## 5. Shared UI Components

Create reusable components to maintain consistency and reduce duplicated code.

Suggested components include:

- `AppLayout`
- `EmployeeLayout`
- `AdminLayout`
- `Sidebar`
- `AppHeader`
- `BreadcrumbHeader`
- `UserAvatarDropdown`
- `AttendanceTable`
- `AttendanceStatusTag`
- `StatCard`
- `QRCodeModal`
- `ConfirmModal`
- `PageLoading`
- `EmptyState`

Use Ant Design components whenever suitable instead of implementing common UI elements from scratch.

Examples:

| Purpose | Ant Design Component |
|---|---|
| Data tables | `Table` |
| Modal dialogs | `Modal` |
| Dropdown menus | `Dropdown` |
| User avatar | `Avatar` |
| Forms | `Form` |
| Text inputs | `Input` |
| Password inputs | `Input.Password` |
| Date selection | `DatePicker`, `RangePicker` |
| Navigation tabs | `Tabs` |
| Navigation breadcrumbs | `Breadcrumb` |
| Status labels | `Tag` |
| Summary cards | `Card`, `Statistic` |
| Notifications | `message`, `notification` |
| Confirmation dialogs | `Modal.confirm` |
| Select inputs | `Select` |
| Pagination | Ant Design `Table` pagination |

---

## 6. Mock Data and Role-Based Testing

Create a centralized mock data structure for testing the application's UI.

Suggested location:

`src/mocks/`

Suggested files:

- `users.ts`
- `attendance.ts`
- `statistics.ts`

### Mock Accounts

Include at least two predefined accounts:

**Employee account**

- Full Name: Nguyen Van An
- Username: employee01
- Password: Employee123!
- Email: employee01@example.com
- Phone Number: 0901234567
- Date of Birth: 2003-05-15
- Role: employee

**Administrator account**

- Full Name: Tran Thi Binh
- Username: admin01
- Password: Admin123!
- Email: admin01@example.com
- Phone Number: 0912345678
- Date of Birth: 1990-08-20
- Role: admin

These accounts are fictional demonstration data. Do not use real personal information.

Create additional mock employees and attendance records to ensure that table sorting, searching, filtering, pagination, and statistics can be tested effectively.

### Mock Authentication

Implement a simple frontend-only authentication simulation.

- Validate Sign In credentials against the predefined mock accounts.
- Store the current mock user in frontend state.
- Use the current user's role to control page access and navigation.
- Redirect employees and administrators to their respective dashboards.
- Simulate Sign Out by clearing the current mock session and returning to Sign In.

Do not implement real authentication, authorization, JWT, or backend sessions.

If persistence across page refreshes is needed for the demonstration, use browser storage for mock session data only.

### Mock QR Codes

Associate each mock employee with a unique QR code value.

For example, the QR code may encode a fictional employee identifier rather than sensitive personal information.

Generate the QR code image locally using a suitable frontend QR code library, or use a mock QR image if QR generation is unavailable.

Do not implement backend QR code generation or database storage.

---

## 7. UI Design Guidelines

### Color Palette

Use a professional corporate design suitable for a company, factory, or enterprise environment.

- Use a consistent primary color inspired by the company's branding.
- Combine the primary color with neutral backgrounds such as white, light gray, and dark text.
- Maintain sufficient contrast between text, backgrounds, buttons, and status indicators.
- Avoid excessive use of gradients.
- Use status colors consistently:
  - Green for successful attendance or present status.
  - Orange or yellow for late arrivals or warnings.
  - Red for absent status or errors.
  - Gray for inactive or unavailable states.

Do not assume a specific company brand color unless it is provided. Define the palette centrally so it can be changed easily.

### Layout and Responsiveness

- Use a consistent spacing system.
- Ensure that forms, tables, cards, and modals are aligned properly.
- Use responsive layouts for desktop, tablet, and mobile screens.
- Keep the kiosk interface optimized for full-screen display.
- Ensure that tables remain usable on smaller screens.
- Use consistent typography, border radii, and component sizing.

### SCSS Requirements

- Use SCSS for all custom styling.
- Avoid inline styles unless necessary for dynamic values.
- Define shared SCSS variables for colors, spacing, typography, and breakpoints.
- Use reusable SCSS partials where appropriate.
- Keep styles modular and organized.
- Avoid introducing Tailwind CSS.

Suggested SCSS structure:

```text
src/
├── styles/
│   ├── abstracts/
│   │   ├── _variables.scss
│   │   └── _mixins.scss
│   ├── base/
│   │   ├── _reset.scss
│   │   └── _typography.scss
│   ├── components/
│   ├── layouts/
│   └── main.scss
```

---

## 8. Suggested Project Structure

Organize the frontend code into clear, reusable modules.

```text
src/
├── assets/
├── components/
│   ├── common/
│   ├── layout/
│   ├── attendance/
│   └── profile/
├── layouts/
│   ├── EmployeeLayout.tsx
│   └── AdminLayout.tsx
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── SignUpPage.tsx
│   │   └── ForgotPasswordPage.tsx
│   ├── kiosk/
│   │   └── KioskPage.tsx
│   ├── employee/
│   │   ├── EmployeeDashboardPage.tsx
│   │   └── EmployeeProfilePage.tsx
│   └── admin/
│       ├── AdminDashboardPage.tsx
│       ├── AdminProfilePage.tsx
│       └── AttendanceStatisticsPage.tsx
├── mocks/
│   ├── users.ts
│   ├── attendance.ts
│   └── statistics.ts
├── routes/
│   └── AppRoutes.tsx
├── hooks/
├── utils/
├── styles/
├── types/
├── App.tsx
└── main.tsx
```

Adapt the structure to the existing project if one is already available. Avoid unnecessary restructuring.

---

## 9. Implementation Order

Implement the UI in the following order:

1. Inspect the existing project structure and installed dependencies.
2. Set up the shared SCSS variables, typography, and global styles.
3. Implement mock accounts, attendance records, and QR code data.
4. Create shared layout components and role-based navigation.
5. Build the Login, Sign Up, and Forgot Password pages.
6. Build the Employee Dashboard, including attendance tables and QR code modal.
7. Build the Employee Profile page.
8. Build the Admin Dashboard.
9. Build the Admin Profile page.
10. Build the Employee Attendance Statistics page.
11. Build the Kiosk page and its simulated scanning states.
12. Connect all pages through frontend routing.
13. Implement and test sorting, searching, filtering, modals, dropdowns, form validation, and mock authentication.
14. Verify responsive behavior and consistent styling.
15. Update `UI_plan.md` with the final implementation results, completed pages, reusable components, mock data, and any known limitations.

---

## 10. Definition of Done

The UI implementation is considered complete when:

- All specified pages are implemented.
- Employee and administrator navigation work correctly.
- Mock accounts can be used to demonstrate both roles.
- Forms have appropriate validation and feedback.
- Employee attendance records support sorting, searching, filtering, and pagination.
- Administrators can inspect attendance records across employees.
- Profile pages display and locally update mock profile information.
- The QR code modal displays the correct mock employee's QR code.
- The Kiosk page presents the camera or simulated scanning interface and appropriate result states.
- Ant Design is used for tables, modals, dropdowns, forms, and other suitable components.
- All custom styling uses SCSS.
- The UI is consistent, responsive, and appropriate for a corporate environment.
- No backend, database, or API integration is implemented.
- The file `UI_plan.md` contains the implementation plan and a summary of the actual UI implementation results.
