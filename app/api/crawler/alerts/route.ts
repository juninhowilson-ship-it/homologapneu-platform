import { NextResponse } from "next/server";
import { listarAlertas } from "@/services/crawlerAlerts";
import { errorResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const acknowledged = searchParams.get("acknowledged");
    const alertas = await listarAlertas({
      acknowledged: acknowledged === null ? undefined : acknowledged === "true",
    });
    return NextResponse.json({ data: alertas });
  } catch (error) {
    return errorResponse(error);
  }
}
