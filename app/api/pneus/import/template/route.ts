import { NextResponse } from "next/server";
import { PNEU_CSV_HEADERS } from "@/lib/constants/pneu";

const EXAMPLE_ROW = [
  "Michelin",
  "Michelin",
  "Primacy 4",
  "205",
  "55",
  "16",
  "91",
  "V",
  "não",
  "não",
  "não",
  "sim",
  "Passeio",
  "Médio",
  "7891234500000",
  "Exemplo de descrição",
  "ativo",
];

export async function GET() {
  const csv = [PNEU_CSV_HEADERS.join(","), EXAMPLE_ROW.join(",")]
    .join("\n")
    .concat("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-pneus.csv"',
    },
  });
}
