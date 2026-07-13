import { NextResponse } from "next/server";

const HEADERS = [
  "codigo",
  "marca",
  "modelo",
  "versao",
  "anoModelo",
  "anoFabricacao",
  "pneuOriginalFabricante",
  "pneuOriginalModelo",
  "pneuOriginalMedida",
  "pneusOpcionais",
  "observacoes",
];
const EXAMPLE_ROW = [
  "H001",
  "Toyota",
  "Corolla",
  "XEi",
  "2024",
  "2023",
  "Michelin",
  "Primacy 4",
  "205/55R16",
  "Pirelli|Cinturato P1|205/55R16;Continental|PowerContact|205/55R16",
  "Exemplo de observação",
];

export async function GET() {
  const csv = [HEADERS.join(","), EXAMPLE_ROW.join(",")].join("\n").concat("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-homologacoes.csv"',
    },
  });
}
