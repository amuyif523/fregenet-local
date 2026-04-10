# Task 14 Implementation Plan: Full ERP Seed Initialization

## Objectives

- Provide a deterministic, idempotent Prisma seed for ERP bootstrap.
- Initialize school centers, staff/accounts, payroll, CRM, inventory, and finance data.
- Avoid duplicate records across repeated seed runs using upsert and existence-aware updates.

## Data Distribution Plan

### 1. Center Topology

- `Addis Pilot` (active)
- `Bishoftu Center` (active)

### 2. Security Bootstrap

- Read SUPERADMIN credentials from:
  - `INITIAL_ADMIN_EMAIL`
  - `INITIAL_ADMIN_PASSWORD`
- Hash password with `bcryptjs` (`saltRounds=12`).
- Create/update one SUPERADMIN `StaffAccount` linked to a `Staff` record in `Addis Pilot`.

### 3. Staff Layout

- Addis Pilot:
  - 1 Director (`StaffRole.ADMIN`)
  - 1 Finance Lead (`StaffRole.SUPPORT`)
  - 2 Teachers (`StaffRole.TEACHER`)
- Bishoftu Center:
  - 2 Teachers (`StaffRole.TEACHER`)

### 4. Payroll Coverage

- Generate current-month payroll records for all seeded staff.
- Use per-staff stable `(staffId, month, year)` check to avoid duplicate payroll entries.
- Financial values computed using `decimal.js` for precision.

### 5. Family / CRM Dataset

- 5 Guardians with normalized Ethiopian 9-digit phone numbers.
- 10 Students with `ACTIVE` status distributed across both centers and grades.
- Guardian mapping includes sibling scenarios (multiple students sharing same guardian).
- Add StudentInteraction entries (`GENERAL_NOTE`, title `Initial Registration`) for a subset.

### 6. Inventory and Finance

Per center inventory seeds:
- Textbooks (`ItemCategory.TEXTBOOK`) with high stock.
- Uniforms (`ItemCategory.UNIFORM`) with low stock near `minStock` alert threshold.
- Laptops (`ItemCategory.ASSET`) for fixed assets.

Finance seeds:
- Multiple `Donation` rows with `COMPLETED` payment status and center attribution.
- `SchoolExpense` rows with categories:
  - `FOOD_PROGRAM`
  - `MAINTENANCE`

## Idempotency Strategy

- `upsert` on natural unique keys where available (`StaffAccount.email`, `Donation.tx_ref`).
- For non-unique models, `findFirst` with deterministic criteria, then `update` or `create`.
- Payroll entries created only when `(staffId, month, year)` record is absent.

## Execution Contract

- Use `PrismaClient` singleton in seed file context.
- Wrap logic in `main()`.
- Terminate with `main().catch(...).finally(() => prisma.$disconnect())`.
- Ensure all generated dates use `new Date()`.
