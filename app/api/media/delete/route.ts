import { NextResponse, type NextRequest } from "next/server";
import { deleteMediaSchema } from "@/lib/validations/media";
import { excluirMedia } from "@/services/media/mediaService";
import { errorResponse } from "@/lib/api-response";

export async function DELETE(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = deleteMediaSchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    await excluirMedia(parsed.data.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
