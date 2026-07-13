import { NextResponse, type NextRequest } from "next/server";
import { homologacaoFormSchema } from "@/lib/validations/homologacao";
import {
  getHomologacao,
  updateHomologacao,
  deleteHomologacao,
} from "@/services/homologacoes";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

type RouteParams = { params: Promise<{ id: string }> };

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const homologacao = await getHomologacao(id);
    return NextResponse.json(homologacao);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = homologacaoFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const user = await getCurrentUser();
    const homologacao = await updateHomologacao(
      id,
      parsed.data,
      user?.name ?? null,
      user?.id ?? null
    );
    return NextResponse.json(homologacao);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    await deleteHomologacao(id, user?.id ?? null);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
