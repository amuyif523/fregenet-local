# Task 10 Implementation Plan: Public Impact Transparency Engine

## Objective
Provide two accountability surfaces:
1. Internal admin activity feed for operational auditability.
2. Public transparency page that shows how income is used, with cached aggregation.

## Public Impact Aggregation Logic (Required Artifact)

### Data Sources
- Income:
  - `Donation` rows with `paymentStatus = COMPLETED`
- Impact Spending:
  - `PayrollRecord` (teacher/staff spending proxy)
  - `SchoolExpense` grouped by category

### Spending Buckets
Public chart will aggregate spending into stable buckets:
- `TEACHERS`: sum of payroll costs
  - `grossSalary + employerPensionContribution`
- `FOOD`: `SchoolExpense.category = FOOD_PROGRAM`
- `CONSTRUCTION`: `SchoolExpense.category = CONSTRUCTION`
- `SUPPLIES`: `SchoolExpense.category = SUPPLIES`
- `OPERATIONS`: `SchoolExpense.category in (UTILITIES, MAINTENANCE)`

### Percentage Formula
Let:
- $S_i$ = amount in bucket $i$
- $T = \sum_i S_i$ (total impact spending)

If $T > 0$:
- $P_i = \frac{S_i}{T} \times 100$

If $T = 0$:
- all percentages default to $0$.

### "Per 1 ETB" Narrative
For each bucket $i$:
- per birr contribution: $B_i = \frac{S_i}{T}$ (range $0$ to $1$)
- display format example: "0.60 ETB of every 1 ETB"

### Public KPI Set
- `totalIncome`: completed donations
- `totalImpactSpending`: payroll + school expenses
- `utilizationRatio`: if income > 0, `totalImpactSpending / totalIncome`, else 0
- donut chart: spending percentages by bucket

### Caching & Invalidation Strategy
- Transparency page uses ISR with `export const revalidate = 3600`.
- Mutation paths call `revalidatePath` for transparency when relevant:
  - finance expense create/update/delete
  - payroll processing
  - donation reconciliation endpoint
- Revalidation targets:
  - `/${locale}/transparency` via localized path-aware invalidation points where locale is known.
  - fallback broad invalidation by route segment where needed.

## Admin Activity Feed Plan

### Sources
- `InventoryLog`
- `StudentInteraction`
- `SchoolExpense`
- `AuditLog` (for unseal override and future security events)

### Unified Event Shape
- `date`
- `actorId`
- `actorName` (resolved through `StaffAccount -> Staff.name`)
- `actionType`
- `notes`

### Retrieval Strategy
- Fetch top N per source (e.g. 100 each), normalize in memory, merge-sort by date descending, return top 100.
- Optimize actor resolution by collecting unique `actorId` values and doing one `StaffAccount.findMany` lookup.

## Emergency Unseal Override Plan

### Authorization
- Only `SUPERADMIN` can unseal.

### Inputs
- `centerId`
- `month`
- `year`
- `reason` (required, minimum non-whitespace length)

### Persistence
- Delete corresponding `SealedFinanceMonth` row.
- Write `AuditLog` entry with mandatory reason and actor metadata.

### Visibility
- Unseal action appears in admin activity feed via `AuditLog` source.

## Localization Coverage Plan
Add ERP localization keys in `en.json` and `am.json` for:
- Staff account roles (`SUPERADMIN`, `DIRECTOR`, `FINANCE`, `STAFF`)
- Attendance statuses (`PRESENT`, `ABSENT`, `TARDY`, `EXCUSED`)
- Expense categories (`FOOD_PROGRAM`, `UTILITIES`, `MAINTENANCE`, `CONSTRUCTION`, `SUPPLIES`)
- New activity/transparency labels and unseal form labels.

## Validation Checklist
- Typecheck passes after schema/client regeneration.
- `/admin/activity` shows latest 100 unified events with actor names.
- `/transparency` renders totals + donut percentages and is ISR cached.
- SUPERADMIN can unseal with mandatory reason.
- Unseal creates visible activity event.
- Localized keys exist in both dictionaries.
