import { NextResponse, type NextRequest } from "next/server";
import { parseImportFile } from "@/lib/importer/parseFile";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Arquivo não enviado" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Arquivo maior que 5MB" },
      { status: 400 }
    );
  }

  const allowed = /\.(csv|xlsx|xls)$/i.test(file.name);
  if (!allowed) {
    return NextResponse.json(
      { error: "Formato não suportado. Use CSV, XLSX ou XLS." },
      { status: 400 }
    );
  }

  try {
    const buffer = await file.arrayBuffer();
    const parsed = await parseImportFile(buffer, file.name);

    if (parsed.headers.length === 0) {
      return NextResponse.json(
        { error: "Não foi possível identificar colunas no arquivo" },
        { status: 400 }
      );
    }

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(
      { error: "Não foi possível ler o arquivo enviado" },
      { status: 400 }
    );
  }
}
