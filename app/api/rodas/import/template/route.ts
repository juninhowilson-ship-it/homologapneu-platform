import { NextResponse } from "next/server";
import { WHEEL_CSV_HEADERS } from "@/lib/constants/roda";

const EXAMPLE_ROW = ["6.5", "16", "40", "5x114.3", "60.1", "ativo"];

export async function GET() {
  const csv = [WHEEL_CSV_HEADERS.join(","), EXAMPLE_ROW.join(",")].join("\n").concat("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-rodas.csv"',
    },
  });
}
