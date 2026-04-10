"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth-guard";
import { ROLE_DIRECTOR, ROLE_STAFF, ROLE_SUPERADMIN, assertRoleAllowed } from "@/lib/rbac";

function parsePositiveInt(value: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("Amount must be a positive whole number.");
  }
  return parsed;
}

function assertCenterScope(centerId: string) {
  if (!centerId || centerId === "GLOBAL") {
    throw new Error("Please select a specific center to change inventory.");
  }
}

async function resolveActiveCenterId() {
  const cookieStore = await cookies();
  const centerId = cookieStore.get("fregenet_center_id")?.value || "GLOBAL";
  assertCenterScope(centerId);
  return centerId;
}

export async function restockItem(itemId: string, amount: number, notes?: string, totalCost?: number) {
  const user = await verifySession();
  assertRoleAllowed(user.role, [ROLE_SUPERADMIN, ROLE_DIRECTOR, ROLE_STAFF]);

  if (!itemId) {
    throw new Error("Item id is required.");
  }

  const centerId = await resolveActiveCenterId();
  const parsedAmount = parsePositiveInt(amount);
  const parsedCost =
    typeof totalCost === "number" && Number.isFinite(totalCost) && totalCost > 0 ? totalCost : null;

  await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findFirst({
      where: { id: itemId, centerId },
      select: { id: true, name: true }
    });

    if (!item) {
      throw new Error("Inventory item not found in the selected center.");
    }

    const updated = await tx.inventoryItem.update({
      where: { id: itemId },
      data: {
        quantity: {
          increment: parsedAmount
        }
      },
      select: {
        quantity: true
      }
    });

    await tx.inventoryLog.create({
      data: {
        itemId,
        centerId,
        performedBy: user.id,
        logType: "RESTOCK",
        quantityDelta: parsedAmount,
        quantityAfter: updated.quantity,
        notes: notes?.trim() || null
      }
    });

    if (parsedCost !== null) {
      const baseDescription = `Inventory restock: ${item.name} (+${parsedAmount})`;
      const detail = notes?.trim();
      await tx.schoolExpense.create({
        data: {
          amount: parsedCost,
          category: "SUPPLIES",
          description: detail ? `${baseDescription}. ${detail}` : baseDescription,
          centerId,
          performedBy: user.id
        }
      });
    }
  });

  revalidatePath("/[locale]/admin/inventory", "page");
  revalidatePath("/[locale]/admin/finance", "page");
  revalidatePath("/[locale]/admin/activity", "page");
  revalidatePath("/en/transparency", "page");
  revalidatePath("/am/transparency", "page");
  return { success: true };
}

export async function issueItem(itemId: string, amount: number, recipientName: string, notes?: string) {
  const user = await verifySession();
  assertRoleAllowed(user.role, [ROLE_SUPERADMIN, ROLE_DIRECTOR, ROLE_STAFF]);

  if (!itemId) {
    throw new Error("Item id is required.");
  }

  const centerId = await resolveActiveCenterId();

  const trimmedRecipient = recipientName?.trim();
  if (!trimmedRecipient) {
    throw new Error("Recipient name is required.");
  }

  const parsedAmount = parsePositiveInt(amount);

  await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findFirst({
      where: { id: itemId, centerId },
      select: { id: true, category: true }
    });

    if (!item) {
      throw new Error("Inventory item not found in the selected center.");
    }

    const decremented = await tx.inventoryItem.updateMany({
      where: {
        id: itemId,
        centerId,
        quantity: {
          gte: parsedAmount
        }
      },
      data: {
        quantity: {
          decrement: parsedAmount
        }
      }
    });

    if (decremented.count === 0) {
      const currentItem = await tx.inventoryItem.findFirst({
        where: { id: itemId, centerId },
        select: { quantity: true }
      });

      throw new Error(`Insufficient stock. Available quantity is ${currentItem?.quantity ?? 0}.`);
    }

    const updated = await tx.inventoryItem.findUnique({
      where: { id: itemId },
      select: {
        quantity: true
      }
    });

    if (!updated) {
      throw new Error("Unable to load updated item quantity.");
    }

    const details = notes?.trim() || `Issued to ${trimmedRecipient}`;
    const notesPrefix = item.category === "ASSET" ? "Asset Assignment" : "Consumable Use";

    await tx.inventoryLog.create({
      data: {
        itemId,
        centerId,
        performedBy: user.id,
        logType: "ISSUE",
        quantityDelta: -parsedAmount,
        quantityAfter: updated.quantity,
        recipientName: trimmedRecipient,
        notes: `${notesPrefix}: ${details}`
      }
    });
  });

  revalidatePath("/[locale]/admin/inventory", "page");
  revalidatePath("/[locale]/admin/activity", "page");
  return { success: true };
}
