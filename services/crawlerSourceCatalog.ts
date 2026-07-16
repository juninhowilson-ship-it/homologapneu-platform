import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { CrawlerDocumentCategory, CrawlerSourceKind, CrawlerSourceStatus } from "@prisma/client";

/**
 * Catálogo permanente de fontes do HomologaPneu Intelligent Crawler
 * (tabela CrawlerSource) — distinto do catálogo de conectores
 * (DataSource, services/sourceManager.ts): aqui cada linha é UMA URL
 * concreta (página índice ou PDF direto), sempre a partir de uma
 * verificação real feita por um humano/agente, nunca inventada.
 */

export type FonteCadastro = {
  manufacturerName: string;
  category: CrawlerDocumentCategory;
  kind: CrawlerSourceKind;
  url: string;
  notes?: string;
  /** PENDENTE (padrão) deixa a fonte para o crawler visitar e decidir;
   * use BLOQUEADA aqui só quando já existe uma verificação real anterior
   * (robots.txt, WAF, catálogo resolvido só por JS) documentada em
   * `notes` — o crawler nunca tenta fontes BLOQUEADA automaticamente. */
  status?: CrawlerSourceStatus;
};

/** Cadastra ou atualiza os metadados descritivos de uma fonte — nunca
 * mexe em robotsAllowed/contentHash/lastVisitedAt/lastUpdatedAt aqui,
 * que só uma visita real (marcarVisita) deve alterar. */
export async function cadastrarFonte(fonte: FonteCadastro) {
  return prisma.crawlerSource.upsert({
    where: { url: fonte.url },
    create: {
      manufacturerName: fonte.manufacturerName,
      category: fonte.category,
      kind: fonte.kind,
      url: fonte.url,
      notes: fonte.notes,
      status: fonte.status ?? "PENDENTE",
    },
    update: {
      manufacturerName: fonte.manufacturerName,
      category: fonte.category,
      kind: fonte.kind,
      notes: fonte.notes,
    },
  });
}

export async function cadastrarFontes(fontes: FonteCadastro[]) {
  let total = 0;
  for (const fonte of fontes) {
    await cadastrarFonte(fonte);
    total++;
  }
  return total;
}

export async function listarFontes(filtro?: { manufacturerName?: string; status?: CrawlerSourceStatus }) {
  return prisma.crawlerSource.findMany({
    where: {
      manufacturerName: filtro?.manufacturerName,
      status: filtro?.status,
    },
    orderBy: [{ manufacturerName: "asc" }, { category: "asc" }],
  });
}

export type VisitaResultado = {
  status: CrawlerSourceStatus;
  robotsAllowed: boolean;
  contentHash: string;
  notes?: string;
  documentsFoundDelta?: number;
};

/** Registra o resultado de UMA visita real a uma fonte. lastUpdatedAt só
 * avança quando o contentHash muda em relação à visita anterior (ou é a
 * primeira visita) — nunca a cada checagem, para não confundir "revisado"
 * com "mudou de verdade". */
export async function marcarVisita(sourceId: number, resultado: VisitaResultado) {
  const fonte = await prisma.crawlerSource.findUniqueOrThrow({ where: { id: sourceId } });
  const primeiraVisita = fonte.contentHash === null;
  const mudou = !primeiraVisita && fonte.contentHash !== resultado.contentHash;

  return prisma.crawlerSource.update({
    where: { id: sourceId },
    data: {
      status: resultado.status,
      robotsAllowed: resultado.robotsAllowed,
      contentHash: resultado.contentHash,
      notes: resultado.notes ?? fonte.notes,
      lastVisitedAt: new Date(),
      ...(primeiraVisita || mudou ? { lastUpdatedAt: new Date() } : {}),
      ...(resultado.documentsFoundDelta
        ? { documentsFound: { increment: resultado.documentsFoundDelta } }
        : {}),
    },
  });
}

export function hashConteudo(dados: string | Uint8Array): string {
  return createHash("sha256").update(dados).digest("hex");
}

export async function obterResumoPainel() {
  const fontes = await prisma.crawlerSource.findMany();
  const manufacturers = new Set(fontes.map((f) => f.manufacturerName));
  return {
    fabricantesMonitorados: manufacturers.size,
    totalFontes: fontes.length,
    fontesAtivas: fontes.filter((f) => f.status === "ATIVA").length,
    fontesBloqueadas: fontes.filter((f) => f.status === "BLOQUEADA").length,
    fontesPendentes: fontes.filter((f) => f.status === "PENDENTE").length,
    fontesComErro: fontes.filter((f) => f.status === "ERRO").length,
    ultimaAtualizacao: fontes
      .map((f) => f.lastUpdatedAt)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0]?.toISOString() ?? null,
    fontes,
  };
}
