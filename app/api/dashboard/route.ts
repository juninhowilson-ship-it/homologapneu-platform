import { NextResponse } from "next/server";
import { obterDashboard } from "@/services/dashboard";

export async function GET() {
  const dashboard = await obterDashboard();

  return NextResponse.json(dashboard);
}
