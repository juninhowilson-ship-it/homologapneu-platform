import { NextResponse } from "next/server";
import { reconhecerAlerta } from "@/services/crawlerAlerts";
import { errorResponse } from "@/lib/api-response";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const alerta = await reconhecerAlerta(Number(id));
    return NextResponse.json(alerta);
  } catch (error) {
    return errorResponse(error);
  }
}
