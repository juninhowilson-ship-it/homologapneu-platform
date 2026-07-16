import { NextResponse, type NextRequest } from "next/server";
import { adicionarDocumento } from "@/services/homologacoes";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();

  try {
    const user = await getCurrentUser();
    const homologacao = await adicionarDocumento(
      Number(id),
      {
        name: body?.name ?? "",
        url: body?.url ?? "",
        type: body?.type ?? null,
        page: body?.page ? Number(body.page) : null,
        sha256: body?.sha256 ?? null,
        manufacturerName: body?.manufacturerName ?? null,
        publishedAt: body?.publishedAt ? new Date(body.publishedAt) : null,
      },
      user?.id ?? null
    );
    return NextResponse.json(homologacao, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
