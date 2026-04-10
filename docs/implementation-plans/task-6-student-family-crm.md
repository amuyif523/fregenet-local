# Task 6 Implementation Plan: Student & Family CRM

## Goal
Implement a center-aware Student CRM module at `app/[locale]/(admin)/admin/students` with:
- Normalized Guardian model (one guardian, multiple students).
- Enhanced Student model and status lifecycle.
- Student directory with URL-based filters.
- Student profile page with guardian details.
- Interaction logging as CRM memory.

## Data Model Design

### Why Separate `Guardian`
A dedicated `Guardian` model prevents duplicated parent records when siblings are enrolled. Updating guardian contact details once updates the shared family profile across all linked students.

### New Enums
- `GuardianRelationship`: `MOTHER`, `FATHER`, `LEGAL_GUARDIAN`
- `StudentGender`: `MALE`, `FEMALE`, `OTHER`
- `StudentStatus`: `ACTIVE`, `INACTIVE`, `ALUMNI`, `DROPPED`
- `InteractionType`: `PARENT_MEETING`, `DISCIPLINARY_NOTE`, `ATTENDANCE_FOLLOWUP`, `UNIFORM_SUPPORT`, `GENERAL_NOTE`

### New Models
- `Guardian`
  - `id`, `name`, `phoneNumber`, `email`, `address`, `relationship`, timestamps
  - relation: `students Student[]`

- `StudentInteraction`
  - `id`, `studentId`, `centerId`, `interactionType`, `title`, `notes`, `interactionDate`, `performedBy`, timestamps
  - relations: `student`, `center`

### Updated `Student`
Replace minimal student fields with:
- `name`, `gradeLevel`, `gender`, `dateOfBirth`, `enrollmentDate`, `status`
- `guardianId` (required FK to `Guardian`)
- `centerId` FK to `SchoolCenter`
- relation: `interactions StudentInteraction[]`

## Multi-Center Logic
- All student reads/writes scoped to active center cookie (`fregenet_center_id`) unless in GLOBAL read mode.
- Student profile route validates that the student belongs to the active center (or allows if GLOBAL).
- GLOBAL mode:
  - show enrollment summary cards by center and total enrollment.
  - disable Add Student mutation UI.

## URL Search Param Strategy
Directory page supports:
- `?q=<name>` for student-name search
- `?grade=<grade>` for grade-level filtering

Benefits:
- bookmarkable/shareable filtered views
- no local-state-only filters

## Server Actions
- `upsertStudentWithGuardian(formData)`
  - create/update guardian and student together in a transaction.
  - enforce non-GLOBAL center context.

- `logStudentInteraction(formData)`
  - store interaction against student + center.
  - include `performedBy` from admin session.
  - revalidate student profile and directory pages.

## UI Plan
- `students/page.tsx`
  - server-side fetch using URL params and center scope.
  - student table + Add Student modal/form for center mode.
  - GLOBAL enrollment summary cards + read-only table.

- `students/[id]/page.tsx`
  - student profile card (shadcn-style Card sections)
  - guardian contact card
  - interaction timeline/table
  - log interaction form (shadcn-style fields)

## Date Handling
Use `date-fns` (`format`, `parseISO`) for all displayed date fields:
- date of birth
- enrollment date
- interaction timestamps
- created/updated metadata

## Validation & Verification
- Prisma schema validation + client generation.
- Focused eslint on new/changed student files.
- Verify:
  - sibling model works via shared `guardianId`.
  - directory URL filters (`q`, `grade`) apply correctly.
  - profile loads guardian and interactions.
  - interaction logging stores `performedBy` and center scoping.
