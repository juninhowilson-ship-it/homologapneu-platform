import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";
import { listarGaragem, salvarNaGaragem, idsGaragem } from "@/services/garagem";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

const salvarSchema = z.object({
  vehicleVersionId: z.number().int().positive(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // ?somenteIds=1 retorna só os IDs (usado pelo botão de coração)
    if (request.nextUrl.searchParams.get("somenteIds")) {
      return NextResponse.json({ ids: await idsGaragem(user.id) });
    }

    return NextResponse.json({ veiculos: await listarGaragem(user.id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const parsed = salvarSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    await salvarNaGaragem(user.id, parsed.data.vehicleVersionId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
