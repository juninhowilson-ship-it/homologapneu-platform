import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Sistema de Alertas: quando um documento já visto antes (mesma
 * `sourceUrl`) volta com um SHA-256 diferente, a fonte oficial publicou
 * uma versão nova — registra o histórico (CrawlerAlert, nunca apagado) e
 * fica disponível para revisão humana. Não decide sozinho se a mudança
 * afeta uma homologação já validada; só sinaliza "isto mudou" com o
 * antes/depois completo (os dois DocumentUpload continuam existindo).
 *
 * Arquivo novo, standalone — chamado pelo pipeline de download depois
 * que um `uploadDocumento()` bem-sucedido cria um DocumentUpload real
 * (a integração em services/intelligentCrawler.ts é o próximo passo,
 * feita depois que a execução em andamento terminar, para não editar o
 * módulo com uma requisição ainda em voo).
 */

export type DeteccaoMudanca = {
  sourceUrl: string;
  manufacturerName: string | null;
  newDocumentUploadId: number;
  newHash: string;
};

/** Verifica se já existia um DocumentUpload anterior para a mesma
 * sourceUrl com um hash diferente do atual — se sim, cria um
 * CrawlerAlert. Idempotente: não gera alerta duplicado para o mesmo par
 * (previousDocumentUploadId, newDocumentUploadId). */
export async function detectarEregistrarAlerta(deteccao: DeteccaoMudanca) {
  const anterior = await prisma.documentUpload.findFirst({
    where: {
      sourceUrl: deteccao.sourceUrl,
      id: { not: deteccao.newDocumentUploadId },
    },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, fileHash: true },
  });

  if (!anterior || anterior.fileHash === deteccao.newHash) {
    return null;
  }

  const jaExiste = await prisma.crawlerAlert.findFirst({
    where: {
      previousDocumentUploadId: anterior.id,
      newDocumentUploadId: deteccao.newDocumentUploadId,
    },
  });
  if (jaExiste) return jaExiste;

  return prisma.crawlerAlert.create({
    data: {
      sourceUrl: deteccao.sourceUrl,
      manufacturerName: deteccao.manufacturerName,
      previousDocumentUploadId: anterior.id,
      newDocumentUploadId: deteccao.newDocumentUploadId,
      previousHash: anterior.fileHash,
      newHash: deteccao.newHash,
      message: `Documento em ${deteccao.sourceUrl} mudou de hash (${anterior.fileHash.slice(0, 12)}… → ${deteccao.newHash.slice(0, 12)}…) — possível nova versão publicada pela fonte oficial.`,
    },
  });
}

export async function listarAlertas(filtro?: { acknowledged?: boolean }) {
  return prisma.crawlerAlert.findMany({
    where: filtro?.acknowledged === undefined ? undefined : { acknowledged: filtro.acknowledged },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function reconhecerAlerta(id: number) {
  return prisma.crawlerAlert.update({ where: { id }, data: { acknowledged: true } });
}
