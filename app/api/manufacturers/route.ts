import { NextResponse } from "next/server";
import { listManufacturers } from "@/services/veiculos";

export async function GET() {
  const manufacturers = await listManufacturers();
  return NextResponse.json(manufacturers);
}
