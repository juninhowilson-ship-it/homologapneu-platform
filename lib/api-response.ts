import "server-only";
import { NextResponse } from "next/server";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors";

export function errorResponse(error: unknown) {
  if (
    error instanceof NotFoundError ||
    error instanceof ConflictError ||
    error instanceof ValidationError
  ) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status }
    );
  }

  console.error(error);
  return NextResponse.json(
    { error: "Erro interno do servidor" },
    { status: 500 }
  );
}
