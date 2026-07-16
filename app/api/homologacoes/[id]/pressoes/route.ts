import { NextResponse, type NextRequest } from "next/server";
import { adicionarPressao } from "@/services/homologacoes";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();

  try {
    const user = await getCurrentUser();
    const homologacao = await adicionarPressao(
      Number(id),
      {
        emptyFront: body?.emptyFront ?? null,
        emptyRear: body?.emptyRear ?? null,
        partialLoadFront: body?.partialLoadFront ?? null,
        partialLoadRear: body?.partialLoadRear ?? null,
        fullLoadFront: body?.fullLoadFront ?? null,
        fullLoadRear: body?.fullLoadRear ?? null,
        source: body?.source ?? null,
        sourceUrl: body?.sourceUrl ?? null,
      },
      user?.id ?? null
    );
    return NextResponse.json(homologacao, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
