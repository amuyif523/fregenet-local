# Task 11 Implementation Plan: CSV Import Mapping and Data Integrity

## Objective
Implement a safe bulk CSV student import flow at `/admin/students/import` that:
- maps CSV columns to `Student` and `Guardian` models,
- prevents duplicate guardian creation via phone-number checks,
- remains center-scoped and auditable.

## CSV Contract
Accepted headers (case-insensitive, trimmed):
- `student_name` (required)
- `grade_level` (required)
- `gender` (required: `MALE|FEMALE|OTHER`)
- `date_of_birth` (required, ISO date)
- `enrollment_date` (required, ISO date)
- `status` (optional, default `ACTIVE`; values: `ACTIVE|INACTIVE|ALUMNI|DROPPED`)
- `guardian_name` (required)
- `guardian_phone` (required)
- `guardian_relationship` (optional, default `LEGAL_GUARDIAN`; values: `MOTHER|FATHER|LEGAL_GUARDIAN`)
- `guardian_email` (optional)
- `guardian_address` (optional)

## Mapping Logic
For each CSV row:
1. Parse and normalize fields.
2. Validate required fields and enum values.
3. Parse dates; reject invalid rows.
4. Normalize guardian phone for deduplication.
5. Resolve guardian:
   - First check in-memory map of existing guardians by normalized phone.
   - If exists: reuse guardian id and optionally refresh guardian profile fields (name/email/address/relationship).
   - If not exists: create guardian, then add to map.
6. Resolve student uniqueness in active center:
   - Match by `(name, dateOfBirth, centerId)`.
   - If matched: update mutable fields (`gradeLevel`, `status`, `guardianId`, `enrollmentDate`, `gender`).
   - If not matched: create new student.

## Duplicate Guardian Rule
- Dedup key: normalized `guardian_phone`.
- Normalization: strip spaces, dashes, parentheses; preserve leading plus when present.
- This avoids multiple guardian rows for the same parent when CSV includes formatting variants.

## Error Handling Strategy
- Continue processing valid rows even if some rows fail.
- Collect row-level errors with row number and message.
- Return summary payload:
  - `processed`
  - `createdStudents`
  - `updatedStudents`
  - `createdGuardians`
  - `failedRows`
  - `errors[]`

## Security and Scope
- Require session and role check (`SUPERADMIN|DIRECTOR|STAFF`).
- Require non-GLOBAL center scope.
- Limit file type to `.csv` and enforce max size guard.

## Cache Invalidation
After successful import:
- `revalidatePath('/[locale]/admin/students', 'page')`
- `revalidatePath('/[locale]/admin/students/import', 'page')`
- `revalidatePath('/[locale]/admin/activity', 'page')`

## UI Plan
- New page: `/admin/students/import`
- Form fields:
  - file input (`accept='.csv,text/csv'`)
  - submit button
- Display import summary and per-row failures.
- Provide header format hint to operators.

## Validation Checklist
- CSV with repeated guardian phone creates one guardian only.
- Existing students update instead of duplicate creation.
- Invalid rows are reported with row numbers; valid rows still import.
- Import runs only when active center is selected (not GLOBAL).
