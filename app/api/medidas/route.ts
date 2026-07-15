import { NextResponse } from "next/server";
import { listarMedidas } from "@/services/medidas";

export async function GET() {
  const medidas = await listarMedidas();
  return NextResponse.json({ data: medidas });
}
