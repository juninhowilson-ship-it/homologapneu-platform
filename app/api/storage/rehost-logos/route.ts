import { NextResponse } from "next/server";
import { rehospedarLogos } from "@/lib/storage/logoRehost";
import { errorResponse } from "@/lib/api-response";

export async function POST() {
  try {
    const resultado = await rehospedarLogos();
    if (!resultado.configurado) {
      return NextResponse.json(
        {
          error:
            "Supabase Storage não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env para habilitar o armazenamento de imagens.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
