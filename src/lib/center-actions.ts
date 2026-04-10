"use server";

import { cookies } from "next/headers";

export async function setCenterScope(centerId: string) {
  const cookieStore = await cookies();
  cookieStore.set("fregenet_center_id", centerId, { path: "/" });
  // We use revalidatePath on root admin level to trigger layout refetch
}

export async function clearCenterScope() {
  const cookieStore = await cookies();
  cookieStore.delete("fregenet_center_id");
}
