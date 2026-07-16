import { NextResponse, type NextRequest } from "next/server";
import { rodaFormSchema } from "@/lib/validations/roda";
import { getRoda, updateRoda, deleteRoda } from "@/services/rodas";
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
  if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  try {
    const roda = await getRoda(id);
    return NextResponse.json(roda);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const body = await request.json();
  const parsed = rodaFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    const roda = await updateRoda(id, parsed.data, user?.id ?? null);
    return NextResponse.json(roda);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  try {
    const user = await getCurrentUser();
    await deleteRoda(id, user?.id ?? null);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
