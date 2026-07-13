import { NextResponse } from "next/server";

const HEADERS = ["nome", "pais", "site", "observacoes", "logo", "status"];
const EXAMPLE_ROW = [
  "Michelin",
  "França",
  "https://www.michelin.com.br",
  "Exemplo de observação",
  "",
  "ativo",
];

export async function GET() {
  const csv = [HEADERS.join(","), EXAMPLE_ROW.join(",")].join("\n").concat("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-fabricantes.csv"',
    },
  });
}
