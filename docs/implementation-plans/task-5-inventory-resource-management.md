# Task 5 Implementation Plan: Inventory & Resource Management

## Scope
Implement the Inventory module at `app/[locale]/(admin)/admin/inventory` with:
- Inventory dashboard list of `InventoryItem` records.
- Low-stock visual alerts when `quantity <= minStock`.
- Server Actions: `restockItem` and `issueItem`.
- Auditable stock movement logs via new `InventoryLog` model.
- Multi-center scoping with GLOBAL consolidated grouping.
- Data table UX with search and category filtering.

## Prisma Schema Changes

### New Enum: `InventoryLogType`
- `RESTOCK`
- `ISSUE`

### New Model: `InventoryLog`
Fields:
- `id`: `String @id @default(cuid())`
- `itemId`: `String` (FK to `InventoryItem`)
- `centerId`: `String` (FK to `SchoolCenter`)
- `logType`: `InventoryLogType`
- `performedBy`: `String` (admin user id from session)
- `quantityDelta`: `Int` (positive for restock, negative for issue)
- `quantityAfter`: `Int` (post-transaction stock level)
- `recipientName`: `String?` (for issuance destination)
- `notes`: `String?` (audit context / free text)
- `createdAt`: `DateTime @default(now())`

Relations:
- `item InventoryItem @relation(fields: [itemId], references: [id], onDelete: Restrict)`
- `center SchoolCenter @relation(fields: [centerId], references: [id], onDelete: Restrict)`

Indexes:
- `@@index([itemId, createdAt])`
- `@@index([centerId, createdAt])`

### Relation Backfills
- Add `logs InventoryLog[]` on `InventoryItem`.
- Add `inventoryLogs InventoryLog[]` on `SchoolCenter`.

## Transaction Logic (Race-Condition Safe)

### `restockItem(itemId, amount, centerId, notes?)`
1. Validate `itemId`, positive integer `amount`, and non-GLOBAL `centerId`.
2. Run `prisma.$transaction(async (tx) => { ... })`.
3. Read item by `id + centerId` (silo enforcement).
4. Increment quantity using atomic update (`quantity: { increment: amount }`).
5. Create `InventoryLog` with:
   - `logType = RESTOCK`
   - `performedBy = session.user.id`
   - `quantityDelta = +amount`
   - `quantityAfter = updated.quantity`
   - `notes` (optional)
6. If `totalCost` is provided:
   - Create `SchoolExpense` in the same transaction
   - `category = SUPPLIES`
   - `centerId = active center`
   - `description = restock context + optional notes`
7. Revalidate inventory and finance routes.

### `issueItem(itemId, amount, recipientName, centerId, notes?)`
1. Validate `itemId`, positive integer `amount`, non-empty `recipientName`, and non-GLOBAL `centerId`.
2. Run `prisma.$transaction(async (tx) => { ... })`.
3. Execute conditional atomic decrement:
   - `updateMany` with `where: { id, centerId, quantity: { gte: amount } }`
   - `data: { quantity: { decrement: amount } }`
4. If `count === 0`, throw insufficient stock error (prevents negative quantities under concurrency).
5. Fetch updated item quantity.
6. Create `InventoryLog` with:
   - `logType = ISSUE`
   - `performedBy = session.user.id`
   - `quantityDelta = -amount`
   - `quantityAfter = updated.quantity`
   - `recipientName`
   - `notes` prefixed as:
     - `Asset Assignment: ...` for `ASSET`
     - `Consumable Use: ...` for other categories
7. Revalidate inventory route.

## UI and Data Flow

### Route
- Create `src/app/[locale]/(admin)/admin/inventory/page.tsx`.

### Page Query Behavior
- Read active center from `fregenet_center_id` cookie.
- If center-specific: fetch items only for that `centerId`.
- If GLOBAL: fetch all items and consolidate by item name for display.

### Data Table
- Build inventory table with:
  - Search input (name matching)
  - Category filter (`ALL`, `STATIONERY`, `UNIFORM`, `TEXTBOOK`, `ASSET`)
  - Columns: Name, Category, Quantity, Min Stock
- Low-stock rows styled in red tone when `quantity <= minStock`.

### Actions UX
- In center-specific mode only:
  - Restock form
  - Issue form with required `recipientName` and `notes` field
- In GLOBAL mode:
  - Read-only consolidated table (no mutation actions)

### Audit Visibility
- Show recent log feed/table (latest first), scoped to selected center or all centers in GLOBAL mode.

## Validation & Verification
- Run TypeScript/lint checks for edited files.
- Confirm Prisma schema parses successfully.
- Verify:
  - Restock increments quantity and writes log.
  - Issue decrements quantity, blocks over-issuance, and writes log.
  - Low-stock highlighting renders correctly.
  - GLOBAL mode shows consolidated grouping by name.
