import { NextResponse, type NextRequest } from "next/server";
import { buscarPneusParaComparar } from "@/services/comparador";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const q = request.nextUrl.searchParams.get("q") ?? "";
    return NextResponse.json({ pneus: await buscarPneusParaComparar(q) });
  } catch (error) {
    return errorResponse(error);
  }
}
