import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Cancelamento cooperativo de uma execução em andamento: não existe um
 * processo separado para "matar" (a execução vive dentro da própria
 * requisição HTTP), então o padrão é a rota /api/crawler/run checar este
 * flag entre uma fonte/documento e o próximo, e parar de forma limpa se
 * estiver marcado. `solicitarParada()` só liga o flag; a checagem em si
 * é ligada em services/intelligentCrawler.ts assim que a execução
 * atualmente em andamento (que antecede este arquivo) terminar, para não
 * editar aquele módulo com uma requisição ainda em voo.
 */
export async function solicitarParada() {
  return prisma.crawlerConfig.upsert({
    where: { id: 1 },
    create: { id: 1, stopRequested: true },
    update: { stopRequested: true },
  });
}

export async function limparParada() {
  return prisma.crawlerConfig.upsert({
    where: { id: 1 },
    create: { id: 1, stopRequested: false },
    update: { stopRequested: false },
  });
}

export async function paradaFoiSolicitada(): Promise<boolean> {
  const config = await prisma.crawlerConfig.findUnique({ where: { id: 1 } });
  return config?.stopRequested ?? false;
}
