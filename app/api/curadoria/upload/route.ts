import { NextResponse, type NextRequest } from "next/server";
import { uploadDocumento } from "@/services/curadoria";
import { getCurrentUser } from "@/lib/auth/dal";
import { errorResponse } from "@/lib/api-response";
import type { EvidenceSourceType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const declaredSourceType = formData.get("declaredSourceType");
    const declaredSourceName = formData.get("declaredSourceName");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }
    if (typeof declaredSourceType !== "string" || typeof declaredSourceName !== "string") {
      return NextResponse.json(
        { error: "Informe o tipo e o nome da fonte do documento" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    const buffer = await file.arrayBuffer();

    const resultado = await uploadDocumento({
      buffer,
      fileName: file.name,
      declaredSourceType: declaredSourceType as EvidenceSourceType,
      declaredSourceName,
      userId: user?.id ?? null,
    });

    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
