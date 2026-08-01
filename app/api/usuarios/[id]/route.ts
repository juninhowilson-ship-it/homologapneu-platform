import { NextResponse, type NextRequest } from "next/server";
import { usuarioFormSchema } from "@/lib/validations/auth";
import {
  getUsuario,
  updateUsuario,
  deleteUsuario,
} from "@/services/usuarios";
import { errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/dal";

type RouteParams = { params: Promise<{ id: string }> };

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const usuario = await getUsuario(id);
    return NextResponse.json(usuario);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = usuarioFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const usuario = await updateUsuario(id, parsed.data);
    return NextResponse.json(usuario);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await deleteUsuario(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
