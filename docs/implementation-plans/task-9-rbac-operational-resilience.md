# Task 9 Implementation Plan: RBAC Enforcement and Operational Resilience

## Scope
Deliver four tracks:
1. Middleware route-level RBAC enforcement across admin pages.
2. Role checks at the top of sensitive Server Actions and admin API endpoints.
3. Attendance UI weekend guard for both Saturday and Sunday.
4. Finance month-sealing mechanism to lock historical expenses after payroll finalization.

## Role Model and Compatibility
- Canonical roles for this task:
  - `SUPERADMIN`
  - `DIRECTOR`
  - `FINANCE`
  - `STAFF`
- Backward compatibility:
  - Existing `ADMIN` sessions are treated as equivalent to `DIRECTOR`.
  - Existing comparisons that already allow `SUPERADMIN` and `ADMIN` remain valid during migration.

## Route-to-Role Mapping (Artifact)

### Global Rule
- `SUPERADMIN` and `DIRECTOR`: full access to all admin routes.

### Admin Route Matrix
- `/{locale}/admin` (Dashboard): `SUPERADMIN`, `DIRECTOR`, `FINANCE`, `STAFF`
- `/{locale}/admin/profile`: `SUPERADMIN`, `DIRECTOR`, `FINANCE`, `STAFF`
- `/{locale}/admin/donations`: `SUPERADMIN`, `DIRECTOR`, `FINANCE`
- `/{locale}/admin/finance`: `SUPERADMIN`, `DIRECTOR`, `FINANCE`
- `/{locale}/admin/staff`: `SUPERADMIN`, `DIRECTOR`, `FINANCE`
- `/{locale}/admin/projects`: `SUPERADMIN`, `DIRECTOR`
- `/{locale}/admin/newsletters`: `SUPERADMIN`, `DIRECTOR`
- `/{locale}/admin/messages`: `SUPERADMIN`, `DIRECTOR`
- `/{locale}/admin/governance`: `SUPERADMIN`, `DIRECTOR`
- `/{locale}/admin/students`: `SUPERADMIN`, `DIRECTOR`, `STAFF`
- `/{locale}/admin/students/[id]`: `SUPERADMIN`, `DIRECTOR`, `STAFF`
- `/{locale}/admin/attendance`: `SUPERADMIN`, `DIRECTOR`, `STAFF`
- `/{locale}/admin/inventory`: `SUPERADMIN`, `DIRECTOR`, `STAFF`

### Explicit Restrictions by Role
- `FINANCE` is blocked from:
  - Student CRM (`/students`, `/students/[id]`)
  - Attendance (`/attendance`)
  - Inventory (`/inventory`)
- `STAFF` is blocked from:
  - Donations (`/donations`)
  - Finance (`/finance`)
  - Payroll operations under staff-management action paths

## Middleware Enforcement Plan
1. Add role normalization helpers to map `ADMIN` -> `DIRECTOR` behavior.
2. Define admin path-prefix access rules matching the matrix above.
3. In `src/middleware.ts`, for authenticated admin requests:
   - Resolve role from session cookie.
   - If route is not allowed, redirect to localized admin dashboard with a deny flag (e.g. `?denied=1`).
4. Add a dashboard toast trigger that reads the deny flag and renders `Permission Denied` feedback.

## Unauthorized Page Plan
- Add localized 403 page at:
  - `src/app/[locale]/(admin)/admin/unauthorized/page.tsx`
- This page is used by server-action/API hard-blocks or direct unauthorized redirects.

## Server Actions and API Protection Plan
1. Create centralized RBAC guard utilities:
   - `requireRole(userRole, allowedRoles)` / `assertRoleAllowed(...)`
2. Apply guards at function start for sensitive mutations/exports:
   - Finance expense create/update/delete
   - Payroll processing
   - Staff management and payroll actions
   - Student CRM mutation actions
   - Attendance save action
   - Admin content mutation actions where applicable
3. API routes:
   - `/api/admin/donations/export`: require role in (`SUPERADMIN`, `DIRECTOR`, `FINANCE`)
   - `/api/admin/donations/sync`: require role in (`SUPERADMIN`, `DIRECTOR`, `FINANCE`) for session-auth mode

## Attendance Weekend Guard Plan
1. Extend server guard to reject both Saturday and Sunday dates.
2. Update attendance client page lock condition:
   - lock if selected date is Saturday or Sunday.
3. Update warning text to indicate weekends, not only Sundays.

## Financial Reconciliation Safety (Seal Month) Plan
1. Add `SealedFinanceMonth` model keyed by `centerId + month + year`.
2. On payroll processing success for a center+month+year:
   - upsert a seal record (`sealedAt`, `sealedBy`).
3. In finance expense create/update/delete:
   - resolve expense month/year (create: from current date; update/delete: from expense `createdAt`)
   - block mutation if matching month is sealed for that center scope.
4. Expose seal state to finance UI:
   - return list of sealed months for center/global scope
   - disable edit/delete actions for expenses in sealed months
   - add explicit "Sealed Month" badge/indicator.

## Verification Checklist
- Middleware redirects restricted role-route access to `/{locale}/admin?denied=1`.
- Dashboard displays `Permission Denied` toast when deny flag exists.
- Unauthorized page loads at `/admin/unauthorized` with 403 semantics.
- Sensitive Server Actions and targeted admin API routes reject disallowed roles.
- Attendance Save is disabled on Saturday and Sunday; server rejects weekend submissions.
- After payroll run for month M/Y, expenses in month M/Y cannot be edited or deleted.
- Build/typecheck passes after Prisma client regeneration for schema changes.
