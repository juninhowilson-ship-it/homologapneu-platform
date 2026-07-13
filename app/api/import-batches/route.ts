import { NextResponse } from "next/server";
import { listarLotes } from "@/services/importBatches";

export async function GET() {
  const lotes = await listarLotes();
  return NextResponse.json({ data: lotes });
}
