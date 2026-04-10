# Fregenet OS: Custom School ERP Specification

## 1. Project Vision
To build a specialized school management system (ERP) integrated directly into the Fregenet Foundation website's admin section. The goal is to provide transparency by linking public donations (Income) directly to internal school operations (Expenses, Staff, Inventory).

## 2. Core Modules

### A. Staff Management (HR & Payroll)
- **Profiles:** Manage teachers and administrators for specific centers.
- **Payroll:** Automated calculation based on Ethiopian tax law (Pension 7%, progressive Income Tax brackets).
- **Attendance:** Digital logs for center staff.

### B. Financial Management (Transparency Engine)
- **Income Integration:** Automatically pulls successful Chapa donation records into the internal ledger.
- **Expense Tracking:** Logging costs for food programs, utilities, and maintenance per center.
- **Reporting:** Income vs. Expense dashboards with Recharts.

### C. Resource Management (Inventory)
- **Stock Tracking:** Textbooks, uniforms, and student supplies.
- **Threshold Alerts:** Red flags when stock falls below `minStock` levels.
- **Issuance:** Tracking which center or staff member received specific items.

### D. Multi-Center Logic
- **Scope:** Distinct data silos for "Addis Pilot" and "Bishoftu Center."
- **Center Switcher:** Global admin toggle to view/manage data for a specific location.

## 3. Technical Architecture (Fregenet-Local Stack)
- **Framework:** Next.js 15 (App Router).
- **Language:** TypeScript.
- **Database:** Prisma ORM with MySQL.
- **Logic Layer:** Next.js Server Actions (replacing the old Express controllers).
- **Security:** Protected by existing `AdminSession` and `AuthGuard` middleware.
- **UI Components:** Tailwind CSS + Existing Shadcn-style UI library.

## 4. Porting Strategy (From ethiopian-business-platform)
- **Database:** Porting models from the ERP repo but renaming them to match school terminology (e.g., Business -> SchoolCenter, Employee -> Staff).
- **Logic:** Refactoring CommonJS controllers into ESM Server Actions.
- **UI:** Adapting the "Business Dashboard" layout to a "School Dashboard" aesthetic.