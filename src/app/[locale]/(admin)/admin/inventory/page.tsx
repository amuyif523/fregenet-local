import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import InventoryClientPage, { type InventoryLogRow, type InventoryTableRow } from "./InventoryClientPage";

type ConsolidatedAccumulator = {
  name: string;
  categories: Set<"STATIONERY" | "UNIFORM" | "TEXTBOOK" | "ASSET">;
  quantity: number;
  minStock: number;
  centers: Set<string>;
};

export default async function InventoryPage() {
  const cookieStore = await cookies();
  const rawCenterId = cookieStore.get("fregenet_center_id")?.value || "GLOBAL";
  const isGlobal = rawCenterId === "GLOBAL";

  const [items, logs] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: isGlobal ? {} : { centerId: rawCenterId },
      include: {
        center: {
          select: {
            name: true
          }
        }
      },
      orderBy: [{ name: "asc" }, { createdAt: "desc" }]
    }),
    prisma.inventoryLog.findMany({
      where: isGlobal ? {} : { centerId: rawCenterId },
      include: {
        item: {
          select: {
            name: true,
            category: true
          }
        },
        center: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 25
    })
  ]);

  const tableRows: InventoryTableRow[] = isGlobal
    ? Array.from(
        items.reduce<Map<string, ConsolidatedAccumulator>>((acc, item) => {
          const existing: ConsolidatedAccumulator = acc.get(item.name) ?? {
            name: item.name,
            categories: new Set<"STATIONERY" | "UNIFORM" | "TEXTBOOK" | "ASSET">(),
            quantity: 0,
            minStock: 0,
            centers: new Set<string>()
          };

          existing.categories.add(item.category);
          existing.quantity += item.quantity;
          existing.minStock += item.minStock;
          existing.centers.add(item.center.name);
          acc.set(item.name, existing);

          return acc;
        }, new Map())
      )
        .map(([, grouped]) => {
          const category: InventoryTableRow["category"] = grouped.categories.size === 1 ? Array.from(grouped.categories)[0] : "MIXED";
          return {
            id: `global-${grouped.name}`,
            name: grouped.name,
            category,
            quantity: grouped.quantity,
            minStock: grouped.minStock,
            centerName: `${grouped.centers.size} center(s)`,
            isGlobalAggregate: true
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    : items.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        minStock: item.minStock,
        centerName: item.center.name,
        isGlobalAggregate: false
      }));

  const logRows: InventoryLogRow[] = logs.map((log) => ({
    id: log.id,
    itemName: log.item.name,
    itemCategory: log.item.category,
    centerName: log.center.name,
    logType: log.logType,
    quantityDelta: log.quantityDelta,
    quantityAfter: log.quantityAfter,
    recipientName: log.recipientName,
    notes: log.notes,
    performedBy: log.performedBy,
    createdAt: log.createdAt.toISOString()
  }));

  return (
    <InventoryClientPage
      isGlobal={isGlobal}
      rows={tableRows}
      logs={logRows}
    />
  );
}
