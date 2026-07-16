import { NextResponse } from "next/server";
import { processarProximoJob } from "@/services/crawlerJobQueue";
import { reanalisarDocumento } from "@/services/crawlerReanalise";
import { errorResponse, } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";
import type { CrawlerJobQueue } from "@prisma/client";

/**
 * Processa o próximo job pendente de UMA fila. CURADORIA já está
 * conectada de verdade (reanalisarDocumento, standalone — não depende do
 * loop do crawler). DOWNLOAD/OCR/PARSING ainda não têm processador
 * ligado aqui — a lógica real de download/parsing já existe dentro de
 * services/intelligentCrawler.ts (processarDocumento/parsePdfFile) e
 * será migrada para consumir estas filas assim que a execução
 * atualmente em andamento terminar (para não editar aquele módulo com
 * uma requisição em voo). Chamar aqui para DOWNLOAD/OCR/PARSING retorna
 * 501 com essa explicação, em vez de fingir que processou algo.
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queue = searchParams.get("queue") as CrawlerJobQueue | null;
    if (!queue) {
      throw new ValidationError("Informe ?queue=DOWNLOAD|OCR|PARSING|CURADORIA");
    }

    if (queue === "CURADORIA") {
      const resultado = await processarProximoJob(queue, async (payload) => {
        const { documentUploadId } = payload as { documentUploadId: number };
        const r = await reanalisarDocumento(documentUploadId);
        return { log: `${r.candidatosNovos} candidato(s) novo(s) de ${r.candidatosExtraidos} extraído(s).` };
      });
      return NextResponse.json(resultado);
    }

    return NextResponse.json(
      {
        error: `Processador da fila ${queue} ainda não conectado — a lógica real já existe em services/intelligentCrawler.ts e será migrada para esta fila numa próxima etapa, para não alterar uma execução em andamento.`,
      },
      { status: 501 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
