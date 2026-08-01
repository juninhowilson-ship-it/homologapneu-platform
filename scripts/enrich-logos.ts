import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { sparqlQuery, sparqlStringLiteral, chunk } from "../lib/importer/connectors/wikidataClient";
import {
  isStorageConfigured,
  ensureLogoBucketsExist,
  uploadImageFromUrl,
  BUCKET_LOGOS,
} from "../lib/storage/supabaseStorage";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * O caminho de imagem em resolução original do Wikimedia (Special:FilePath
 * e o commons/ direto) está bloqueado por rate limit (429) há dias nesta
 * sessão. Descoberta: pedindo uma miniatura pela API do MediaWiki
 * (`action=query&prop=imageinfo&iiurlwidth=`), o upload.wikimedia.org
 * devolve um caminho `/thumb/.../NNNpx-arquivo` que NÃO está bloqueado —
 * só o caminho de original é. Resolve a URL do Wikidata (Special:FilePath)
 * para o nome do arquivo e busca a miniatura via essa API antes de baixar.
 */
async function resolverUrlMiniatura(specialFilePathUrl: string, largura = 300): Promise<string | null> {
  const nomeArquivo = decodeURIComponent(specialFilePathUrl.split("Special:FilePath/")[1] ?? "");
  if (!nomeArquivo) return null;
  const params = new URLSearchParams({
    action: "query",
    titles: `File:${nomeArquivo}`,
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: String(largura),
    format: "json",
  });
  const resp = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
    headers: { "User-Agent": "HomologaPneu/1.0 (contato via painel administrativo)" },
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const pages = data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0] as { imageinfo?: { thumburl?: string; url?: string }[] } | undefined;
  return page?.imageinfo?.[0]?.thumburl ?? page?.imageinfo?.[0]?.url ?? null;
}

/** Wikimedia Commons devolve 429 se as requisições vierem sem intervalo —
 * espaça cada download e tenta de novo uma vez com espera maior. */
async function uploadComRetry(
  bucket: string,
  path: string,
  sourceUrl: string,
  delayMs: number
) {
  await sleep(delayMs);
  const urlMiniatura = await resolverUrlMiniatura(sourceUrl);
  const urlFinal = urlMiniatura ?? sourceUrl;
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      return await uploadImageFromUrl(bucket, path, urlFinal);
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : String(error);
      if (!mensagem.includes("429") || tentativa === 3) throw error;
      await sleep(delayMs * tentativa * 5);
    }
  }
  throw new Error("unreachable");
}

/**
 * Enriquece Manufacturer/TireManufacturer com logo via Wikidata (mesma
 * lógica de lib/importer/connectors/wikidataMontadoras.ts e
 * wikidataFabricantesPneus.ts, reimplementada aqui porque esses conectores
 * importam repositories/ com `server-only`) e re-hospeda no Supabase
 * Storage (lib/storage/logoRehost.ts, mesmo motivo). Só grava logoUrl
 * quando o Wikidata confirma por nome exato + classe correta — nunca
 * inventa um logo para quem não tem correspondência.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const BATCH_SIZE = 40;
const AUTOMOBILE_MANUFACTURER_CLASS = "wd:Q786820";
const TIRE_PRODUCT = "wd:Q169545";

function buildMontadoraQuery(names: string[]): string {
  const values = names.map(sparqlStringLiteral).join(" ");
  return `
SELECT ?nameIn ?logo WHERE {
  VALUES ?nameIn { ${values} }
  ?item rdfs:label ?rawLabel .
  FILTER(STR(?rawLabel) = ?nameIn)
  ?item wdt:P31/wdt:P279* ${AUTOMOBILE_MANUFACTURER_CLASS} .
  OPTIONAL { ?item wdt:P154 ?logo . }
  FILTER(BOUND(?logo))
}`;
}

// Sem NENHUM filtro de classe, nomes comuns (ex.: "Titan", "Royal",
// "Drive", "Matrix") batem em milhares de entidades não relacionadas
// (pessoas, filmes, navios...) e a consulta expira (HTTP 504). P1056
// (produto de saída = pneu) é bom demais — derruba até a Continental AG,
// que não preenche essa propriedade — então usamos uma classe mais larga
// só pra manter a consulta rápida (empresa/marca/organização comercial).
// P31 direto (sem P279*/subclasse transitiva) pra manter rápido — a
// árvore de subclasses de "business"/"enterprise" é enorme e generalizaria
// o timeout de novo.
const CLASSES_EMPRESA = ["wd:Q4830453", "wd:Q6881511", "wd:Q431289", "wd:Q167037", "wd:Q891723"]; // business, enterprise, brand, corporation, public company

function buildFabricanteQuery(names: string[]): string {
  const values = names.map(sparqlStringLiteral).join(" ");
  return `
SELECT ?nameIn ?logo WHERE {
  VALUES ?nameIn { ${values} }
  VALUES ?classe { ${CLASSES_EMPRESA.join(" ")} }
  ?item rdfs:label ?rawLabel .
  FILTER(STR(?rawLabel) = ?nameIn)
  ?item wdt:P31 ?classe .
  OPTIONAL { ?item wdt:P154 ?logo . }
  FILTER(BOUND(?logo))
}`;
}

function pareceLogoValido(specialFilePathUrl: string): boolean {
  const nomeArquivo = decodeURIComponent(specialFilePathUrl.split("Special:FilePath/")[1] ?? "").toLowerCase();
  if (!nomeArquivo) return false;
  const ehSvgOuPng = /\.(svg|png)$/.test(nomeArquivo);
  const contemPalavraLogo = /logo|emblem|badge|wordmark/.test(nomeArquivo);
  // Nome de arquivo com jeito de foto (data, "flickr", resolução no nome,
  // várias palavras soltas) e extensão .jpg é sinal forte de que é uma
  // foto do carro/prédio, não o logo — como aconteceu com o P154 da Peugeot.
  return ehSvgOuPng || contemPalavraLogo;
}

async function enriquecerLogos(
  label: string,
  nomes: string[],
  buildQuery: (names: string[]) => string,
  batchSize = BATCH_SIZE
): Promise<Map<string, string>> {
  const logoPorNome = new Map<string, string>();
  for (const batch of chunk(nomes, batchSize)) {
    let bindings;
    try {
      bindings = await sparqlQuery(buildQuery(batch));
    } catch {
      await sleep(3000);
      try {
        bindings = await sparqlQuery(buildQuery(batch)); // 1 retry — Wikidata público é instável
      } catch (error) {
        // Um lote pesado (timeout) não deve derrubar o restante — pula e
        // segue com os próximos, em vez de perder todo o progresso já feito.
        console.log(`Lote pulado (falhou 2x): ${error instanceof Error ? error.message : error}`);
        continue;
      }
    }
    for (const binding of bindings) {
      const nome = binding.nameIn?.value;
      const logo = binding.logo?.value;
      // P154 do Wikidata às vezes está com dado errado (ex.: Peugeot
      // aponta pra uma FOTO de carro, não pro logo da marca) — filtra por
      // extensão/nome de arquivo plausível de logo antes de aceitar.
      if (nome && logo && !logoPorNome.has(nome) && pareceLogoValido(logo)) {
        logoPorNome.set(nome, logo);
      }
    }
  }
  console.log(`${label}: ${logoPorNome.size} logos encontrados de ${nomes.length} pesquisados`);
  return logoPorNome;
}

async function main() {
  // --- 1) Enriquecimento: acha logo via Wikidata para quem ainda não tem ---
  const montadorasSemLogo = await prisma.manufacturer.findMany({
    where: { logoUrl: null },
    select: { id: true, name: true },
  });
  const logosMontadora = await enriquecerLogos(
    "Montadoras",
    montadorasSemLogo.map((m) => m.name),
    buildMontadoraQuery
  );
  for (const m of montadorasSemLogo) {
    const logo = logosMontadora.get(m.name);
    if (logo) await prisma.manufacturer.update({ where: { id: m.id }, data: { logoUrl: logo } });
  }

  const fabricantesSemLogo = await prisma.tireManufacturer.findMany({
    where: { logoUrl: null },
    select: { id: true, name: true },
  });
  // Sem filtro de classe (ver comentário em buildFabricanteQuery), nomes
  // de 1-2 letras (ex.: "JK") são alto risco de colidir com entidade
  // errada — pula esses da busca em vez de arriscar.
  const fabricantesElegiveis = fabricantesSemLogo.filter((f) => f.name.replace(/[^a-zA-Z0-9]/g, "").length >= 3);
  const logosFabricante = await enriquecerLogos(
    "Fabricantes de pneu",
    fabricantesElegiveis.map((f) => f.name),
    buildFabricanteQuery,
    15
  );
  for (const f of fabricantesSemLogo) {
    const logo = logosFabricante.get(f.name);
    if (logo) await prisma.tireManufacturer.update({ where: { id: f.id }, data: { logoUrl: logo } });
  }

  // --- 2) Re-hospedagem: baixa cada logo (Wikimedia Commons) e sobe pro Supabase Storage ---
  if (!isStorageConfigured()) {
    console.log("Supabase Storage não configurado — pulando re-hospedagem.");
    return;
  }

  const buckets = await ensureLogoBucketsExist();
  console.log("Buckets:", JSON.stringify(buckets));

  function isJaHospedadoNoSupabase(url: string): boolean {
    return url.includes(".supabase.co/storage/");
  }

  let reenviadosMontadora = 0;
  let reenviadosFabricante = 0;
  const erros: { entidade: string; nome: string; erro: string }[] = [];

  const todasMontadoras = await prisma.manufacturer.findMany({
    where: { logoUrl: { not: null } },
    select: { id: true, name: true, logoUrl: true },
  });
  for (const m of todasMontadoras) {
    const logoUrl = m.logoUrl as string;
    if (isJaHospedadoNoSupabase(logoUrl)) continue;
    try {
      const armazenado = await uploadComRetry(BUCKET_LOGOS, `montadoras/${m.id}.png`, logoUrl, 8000);
      await prisma.manufacturer.update({ where: { id: m.id }, data: { logoUrl: armazenado.publicUrl } });
      reenviadosMontadora++;
    } catch (error) {
      erros.push({ entidade: "Manufacturer", nome: m.name, erro: error instanceof Error ? error.message : String(error) });
    }
  }

  const todosFabricantes = await prisma.tireManufacturer.findMany({
    where: { logoUrl: { not: null } },
    select: { id: true, name: true, logoUrl: true },
  });
  for (const f of todosFabricantes) {
    const logoUrl = f.logoUrl as string;
    if (isJaHospedadoNoSupabase(logoUrl)) continue;
    try {
      const armazenado = await uploadComRetry(BUCKET_LOGOS, `fabricantes-pneus/${f.id}.png`, logoUrl, 4000);
      await prisma.tireManufacturer.update({ where: { id: f.id }, data: { logoUrl: armazenado.publicUrl } });
      reenviadosFabricante++;
    } catch (error) {
      erros.push({ entidade: "TireManufacturer", nome: f.name, erro: error instanceof Error ? error.message : String(error) });
    }
  }

  console.log("=== RESUMO ===");
  console.log(JSON.stringify({
    montadorasEnriquecidas: logosMontadora.size,
    fabricantesEnriquecidos: logosFabricante.size,
    reenviadosMontadora,
    reenviadosFabricante,
    erros,
  }, null, 2));
}

main()
  .catch((e) => { console.error("Falha geral:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
