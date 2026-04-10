# Task 7 Implementation Plan: Attendance + DB Auth Migration

## Scope
Deliver two tracks:
1. Replace env-password admin auth with database-backed `StaffAccount` authentication.
2. Add center-aware attendance module at `/admin/attendance` with date-aware filtering and atomic bulk saves.

## Part A: Auth Migration Plan

### Current State
- Login relies on `ADMIN_PASSWORD_HASH` env var.
- Session user is hardcoded as `{ id: "admin", role: "admin" }`.
- `performedBy` in server actions currently uses session id, but id is not tied to real `StaffAccount` records.

### Target State
- Login validates credentials against `StaffAccount` (`email`, `password` hash).
- Session stores real account identity:
  - `id` = `StaffAccount.id`
  - `role` = `StaffAccount.role`
  - `email` and `staffId` for audit context
- Middleware and guards treat any valid logged-in session as authenticated.

### Implementation Steps
1. Update `AdminUserSession` type in `admin-session.ts` to represent real account shape.
2. Replace `verifyAdminPassword` with `verifyAdminCredentials(email, password)` in `admin-auth.ts`.
3. Update `createAdminSession` to accept authenticated account payload.
4. Update `/api/admin/login` route schema from `{ password }` to `{ email, password }`.
5. Update login page form UI to request email + password.
6. Update auth checks and role gates to use DB role values (`ADMIN` / `STAFF`).

### Audit Trail Alignment
- Inventory, CRM, and Finance server actions should use `verifySession().id`, now a real `StaffAccount.id`.
- Add `performedBy` to `SchoolExpense` so finance mutations also capture actor identity.

## Part B: Attendance Module Plan

### Schema Additions
- Enum `AttendanceStatus`:
  - `PRESENT`, `ABSENT`, `TARDY`, `EXCUSED`
- Model `Attendance`:
  - `id`, `studentId`, `centerId`, `date`, `status`, `notes?`, `performedBy`, timestamps
  - relation to `Student` and `SchoolCenter`
  - unique key on `[studentId, date]` to prevent duplicates
  - indexes on `[centerId, date]` and `[status, date]`

### Attendance UI and Behavior
- Route: `app/[locale]/(admin)/admin/attendance/page.tsx`
- Date-aware view using URL search params: `?date=YYYY-MM-DD`
- List all `ACTIVE` students for selected center on selected date.
- Controls:
  - “Mark All Present” action in UI state
  - per-student status toggles and notes
  - submit all rows with one save action

### Bulk Save Transaction Logic
`saveAttendanceSheet(date, entries[])`:
1. Validate active center is not `GLOBAL`.
2. Validate date and entries.
3. Prisma `$transaction`:
   - verify all student IDs belong to center and are `ACTIVE`
   - upsert each attendance row by `(studentId, date)`
   - write `status`, `notes`, `centerId`, `performedBy`
4. Revalidate attendance page and affected student directory/profile views.

## Retention Alert Plan (Student Directory)
- Compute recent attendance per student (most recent records first).
- Determine max consecutive `ABSENT` streak.
- If streak > 3, show yellow flag indicator in student table.

## Lint / Stability Plan
- Run `npm run lint`.
- Resolve existing lint failures in finance/staff/student modules (not just new files) so build becomes stable.

## Verification
- Validate Prisma schema/generate client.
- Verify:
  - DB auth login succeeds with real `StaffAccount`.
  - session now carries account ID.
  - `performedBy` values reflect account IDs in Inventory, CRM, Finance records.
  - attendance can be saved atomically for a full roster.
  - date param changes view for historical attendance.
  - retention alert appears for >3 consecutive absences.
