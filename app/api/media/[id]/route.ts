import { NextResponse } from "next/server";
import { obterMedia } from "@/services/media/mediaService";
import { errorResponse } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const media = await obterMedia(Number(id));
    return NextResponse.json(media);
  } catch (error) {
    return errorResponse(error);
  }
}
