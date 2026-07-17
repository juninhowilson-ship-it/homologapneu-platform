import { NextResponse, type NextRequest } from "next/server";
import { uploadMediaMetaSchema } from "@/lib/validations/media";
import { fazerUploadMedia } from "@/services/media/mediaService";
import { errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }

    const meta = Object.fromEntries(
      Array.from(formData.entries()).filter(([key]) => key !== "file")
    );
    const parsed = uploadMediaMetaSchema.safeParse(meta);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const media = await fazerUploadMedia({
      ...parsed.data,
      originalUrl: parsed.data.originalUrl || undefined,
      buffer,
      declaredMimeType: file.type,
    });

    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
