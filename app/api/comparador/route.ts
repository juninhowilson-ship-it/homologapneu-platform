import { NextResponse, type NextRequest } from "next/server";
import { compararPneus } from "@/services/comparador";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const ids = (request.nextUrl.searchParams.get("ids") ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);

    return NextResponse.json({ pneus: await compararPneus(ids) });
  } catch (error) {
    return errorResponse(error);
  }
}
