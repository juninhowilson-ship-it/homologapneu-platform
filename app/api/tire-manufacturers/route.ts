import { NextResponse } from "next/server";
import { listTireManufacturers } from "@/services/pneus";

export async function GET() {
  const tireManufacturers = await listTireManufacturers();
  return NextResponse.json(tireManufacturers);
}
