import "server-only";
import { prisma } from "@/lib/prisma";
import { obterUltimosCommits } from "@/lib/dev-status";
import { obterCoberturaNacional } from "@/services/cobertura";
import { isStorageConfigured } from "@/lib/storage/supabaseStorage";
import { EPICS } from "@/lib/roadmap-data";

export type AppStatus = {
  commit: { sha: string; message: string; ref: string | null } | null;
  ambiente: string;
  buildTime: string | null;
  banco: { ok: boolean; latenciaMs: number | null; erro: string | null };
  supabase: {
    storageConfigurado: boolean;
    authIntegrado: boolean;
    observacao: string;
  };
  contadores: {
    montadoras: number;
    modelos: number;
    versoes: number;
    pneus: number;
    homologacoes: number;
  };
  coberturaNacional: number;
  ultimaImportacao: string | null;
  proximaMissao: string | null;
  verificadoEm: string;
};

/**
 * Origem do commit exibido: em produção na Vercel, as variáveis
 * VERCEL_GIT_COMMIT_* são injetadas em runtime pela própria plataforma
 * (reais, não requerem `.git` no bundle). Em ambiente local, cai para
 * `git log` (lib/dev-status.ts), que já é usado em /dev.
 */
function obterCommitAtual(): AppStatus["commit"] {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (sha) {
    return {
      sha: sha.slice(0, 7),
      message: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "(sem mensagem)",
      ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    };
  }
  const [ultimo] = obterUltimosCommits(1);
  if (!ultimo) return null;
  return { sha: ultimo.hash, message: ultimo.message, ref: null };
}

async function verificarBanco(): Promise<AppStatus["banco"]> {
  const inicio = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latenciaMs: Date.now() - inicio, erro: null };
  } catch (error) {
    return {
      ok: false,
      latenciaMs: null,
      erro: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

async function obterUltimaImportacao(): Promise<string | null> {
  const ultimoLote = await prisma.importBatch.findFirst({
    orderBy: { startedAt: "desc" },
    select: { fileName: true, entity: true, finishedAt: true, startedAt: true },
  });
  if (!ultimoLote) return null;
  const quando = (ultimoLote.finishedAt ?? ultimoLote.startedAt).toISOString();
  return `${ultimoLote.entity} — ${ultimoLote.fileName} (${quando})`;
}

function obterProximaMissao(): string | null {
  const emAndamento = EPICS.find((epic) => epic.status === "em-andamento");
  if (emAndamento) return emAndamento.titulo;
  const proximaPendente = EPICS.find((epic) => epic.status === "pendente");
  return proximaPendente?.titulo ?? null;
}

export async function obterStatusAplicacao(): Promise<AppStatus> {
  const [banco, contadoresRaw, cobertura, ultimaImportacao] = await Promise.all([
    verificarBanco(),
    Promise.all([
      prisma.manufacturer.count(),
      prisma.vehicleModel.count(),
      prisma.vehicleVersion.count(),
      prisma.tire.count(),
      prisma.homologation.count(),
    ]),
    obterCoberturaNacional(),
    obterUltimaImportacao(),
  ]);

  const [montadoras, modelos, versoes, pneus, homologacoes] = contadoresRaw;

  return {
    commit: obterCommitAtual(),
    ambiente: process.env.VERCEL_ENV ?? "local",
    buildTime: process.env.BUILD_TIME ?? null,
    banco,
    supabase: {
      storageConfigurado: isStorageConfigured(),
      // A aplicação usa autenticação própria (JWT assinado em cookie,
      // ver proxy.ts/lib/auth) — não há integração com Supabase Auth.
      // Reportado explicitamente para não sugerir uma integração que
      // não existe.
      authIntegrado: false,
      observacao: isStorageConfigured()
        ? "Supabase Storage configurado."
        : "Supabase Storage aguardando SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY. Autenticação usa sistema próprio (JWT), não Supabase Auth.",
    },
    contadores: { montadoras, modelos, versoes, pneus, homologacoes },
    coberturaNacional: cobertura.coberturaBrasil.percentual,
    ultimaImportacao,
    proximaMissao: obterProximaMissao(),
    verificadoEm: new Date().toISOString(),
  };
}
