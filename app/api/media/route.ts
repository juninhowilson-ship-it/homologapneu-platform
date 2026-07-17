import { NextResponse, type NextRequest } from "next/server";
import { mediaListQuerySchema, registerMediaSchema } from "@/lib/validations/media";
import { listarMedia, registrarMediaPendente } from "@/services/media/mediaService";
import { errorResponse } from "@/lib/api-response";

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

/**
 * Registra uma mídia PENDENTE só com metadados + originalUrl — não baixa
 * nada agora (ver services/media/mediaService.ts). É o endpoint que um
 * crawler de mídia futuro usaria para anunciar "achei esta foto oficial".
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerMediaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const media = await registrarMediaPendente(parsed.data);
    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
