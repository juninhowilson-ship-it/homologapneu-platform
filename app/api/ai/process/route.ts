import { NextResponse, type NextRequest } from "next/server";
import { receberDocumento } from "@/services/ai/ingest";
import { requireAdmin } from "@/lib/auth/dal";
import { errorResponse } from "@/lib/api-response";

/// POST /api/ai/process — recebe um documento (multipart, campo "file") e
/// enfileira um AiJob. NUNCA processa inline (mesmo padrão de
/// app/api/curadoria/upload/route.ts): o processamento acontece de forma
/// assíncrona via POST /api/ai/jobs/process, disparado pelo botão
/// "Processar próximo" no Dashboard IA.
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();

    const job = await receberDocumento({
      buffer,
      fileName: file.name,
      userId: user.id,
    });

    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
