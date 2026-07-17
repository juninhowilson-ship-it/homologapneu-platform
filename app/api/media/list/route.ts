import { NextResponse, type NextRequest } from "next/server";
import { mediaListQuerySchema } from "@/lib/validations/media";
import { listarMedia } from "@/services/media/mediaService";

/**
 * Alias explícito de GET /api/media, pedido como endpoint próprio
 * ("/list") — usado pela grade do painel Biblioteca de Imagens.
 */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = mediaListQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetros inválidos", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const resultado = await listarMedia(parsed.data);
  return NextResponse.json(resultado);
}
