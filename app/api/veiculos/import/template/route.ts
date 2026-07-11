import { NextResponse } from "next/server";
import {
  VEICULO_CSV_HEADERS,
  VEICULO_CSV_EXAMPLE_ROW,
} from "@/lib/constants/veiculo";

export async function GET() {
  const csv = [VEICULO_CSV_HEADERS.join(","), VEICULO_CSV_EXAMPLE_ROW.join(",")]
    .join("\n")
    .concat("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-veiculos.csv"',
    },
  });
}
