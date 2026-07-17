import { NextResponse, type NextRequest } from "next/server";
import { regenerateThumbnailSchema } from "@/lib/validations/media";
import { regenerarThumbnail } from "@/services/media/mediaService";
import { errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = regenerateThumbnailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const media = await regenerarThumbnail(parsed.data.id);
    return NextResponse.json(media);
  } catch (error) {
    return errorResponse(error);
  }
}
