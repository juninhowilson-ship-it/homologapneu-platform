import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { sincronizarFontesOficiais, validarFontesPendentes, monitorarFontes, obterEstatisticasFontes } from "./lib/sourceDiscovery";

/**
 * npm run source:discovery
 *
 * Camada de Source Discovery: sincroniza o cadastro de OfficialSource
 * (fontes universais + bridge dos CrawlerSource já conhecidos), valida
 * (rede real, sem contornar bloqueio algum) as que ainda estão PENDENTE,
 * monitora (só status, nunca baixa documento) as já ATIVA/BLOQUEADA, e
 * imprime o dashboard técnico final. Não importa nenhuma montadora — só
 * cataloga, classifica e monitora fontes.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== Source Discovery — sincronização ===\n");
  const sync = await sincronizarFontesOficiais(prisma);
  console.log(`Fontes universais garantidas: ${sync.universaisCriadas} novas`);
  console.log(`CrawlerSource espelhados: ${sync.crawlerSourcesEspelhadas}\n`);

  console.log("=== Validando fontes pendentes (rede real, sem bypass) ===\n");
  const validacao = await validarFontesPendentes(prisma);
  console.log(`Fontes validadas nesta rodada: ${validacao.validadas}\n`);

  console.log("=== Monitoramento (só status, nunca baixa documento) ===\n");
  const monitoramento = await monitorarFontes(prisma);
  console.log(`Fontes verificadas: ${monitoramento.verificadas}`);
  console.log(`ATIVA -> BLOQUEADA: ${monitoramento.mudancasAtivaParaBloqueada}`);
  console.log(`BLOQUEADA -> ATIVA: ${monitoramento.mudancasBloqueadaParaAtiva}`);
  console.log(`REMOVIDA: ${monitoramento.removidas}`);
  console.log(`REDIRECIONADA: ${monitoramento.redirecionadas}`);
  console.log(`NOVOS DOCUMENTOS: ${monitoramento.novosDocumentos}\n`);

  console.log("=== Dashboard Técnico ===\n");
  const stats = await obterEstatisticasFontes(prisma);
  console.log(`Fabricantes cobertos: ${stats.fabricantesAnalisados}`);
  console.log(`Fontes ATIVA: ${stats.fontesAtivas}`);
  console.log(`Fontes BLOQUEADA: ${stats.fontesBloqueadas}`);
  console.log(`Fontes PENDENTE: ${stats.fontesPendentes}`);
  console.log(`Fontes REMOVIDA: ${stats.fontesRemovidas}`);
  console.log(`\nFabricantes sem nenhuma fonte útil (0 ativas): ${stats.fabricantesSemFonteUtil.length}`);
  if (stats.fabricantesSemFonteUtil.length > 0 && stats.fabricantesSemFonteUtil.length <= 30) {
    console.log(`  ${stats.fabricantesSemFonteUtil.join(", ")}`);
  }

  console.log(`\n-- Ranking das melhores fontes (top 15 por health score) --`);
  for (const f of stats.rankingMelhoresFontes) {
    console.log(`  [${f.healthScore}] ${f.manufacturerName} — ${f.type} — ${f.documentsCount} docs — ${f.url}`);
  }

  console.log(`\n-- Evolução nas últimas 24h --`);
  console.log(`  Novas fontes descobertas: ${stats.evolucao24h.novasFontes}`);
  console.log(`  Mudanças para ATIVA: ${stats.evolucao24h.mudancasParaAtiva}`);
  console.log(`  Mudanças para BLOQUEADA: ${stats.evolucao24h.mudancasParaBloqueada}`);
  console.log(`  Novos documentos detectados: ${stats.evolucao24h.novosDocumentos}`);

  console.log(`\n-- Cobertura potencial por fabricante (top 20 com mais fontes ativas) --`);
  for (const f of stats.porFabricante.slice(0, 20)) {
    console.log(
      `  ${f.manufacturerName}: ${f.total} fontes (${f.ativas} ativas, ${f.bloqueadas} bloqueadas, ${f.pendentes} pendentes) — ${f.coberturaPotencial}${f.melhorFonte ? ` | melhor: ${f.melhorFonte}` : ""}`
    );
  }
}

main()
  .catch((e) => {
    console.error("ERRO:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
