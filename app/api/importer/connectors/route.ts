import { NextResponse } from "next/server";
import { listConnectors } from "@/lib/importer/connectors/registry";

export async function GET() {
  return NextResponse.json({ data: listConnectors() });
}
