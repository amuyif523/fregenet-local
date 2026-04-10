import { NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/admin-auth";

export async function POST() {
  await destroyAdminSession();
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  await destroyAdminSession();

  const response = NextResponse.redirect(new URL("/admin/login", request.url));
  return response;
}
