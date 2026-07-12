import { NextResponse } from "next/server";
import { logout } from "@/services/auth";

export async function POST() {
  await logout();
  return new NextResponse(null, { status: 204 });
}
