import { NextResponse } from "next/server";
import { listEvidenceConnectors } from "@/lib/importer/connectors/evidenceSources";

export async function GET() {
  return NextResponse.json({ data: listEvidenceConnectors() });
}
