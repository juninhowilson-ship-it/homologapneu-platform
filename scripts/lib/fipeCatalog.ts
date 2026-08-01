import { PrismaClient } from "@prisma/client";
import { getNameplateHints } from "@/lib/importer/fipeNameplateHints";
import { findOrCreateVehicleModelId } from "@/lib/masterData/resolveVehicleModel";
import { normalizeLookupKey } from "@/lib/masterData/normalizeName";
import { getCachedOrFetch, type CachedResult } from "@/lib/cache/externalCache";

/**
 * Normalização genérica de catálogo FIPE por montadora: separa
 * VehicleModel "sujo" (nome = modelo+versão inteiro, como o conector
 * fipe-modelos-veiculo grava) em VehicleModel real + VehicleVersion,
 * usando ano/combustível reais recuperados da própria API da FIPE
 * (/anos) — nunca inventa medida. Generalização do que foi validado
 * manualmente para a Toyota (ver git log / scratchpad da sessão).
 *
 * "Já normalizado" é detectado por dado, não por nome hardcoded: um
 * VehicleModel com pelo menos 1 VehicleVersion já é uma linha
 * estruturada (veio de import técnico real — ex.: PBE/INMETRO — ou de
 * uma rodada anterior desta função) e é pulado, nunca reprocessado. Um
 * VehicleModel já com deletedAt também é pulado (idempotente).
 *
 * Sem hints (lib/importer/fipeNameplateHints.ts) para a montadora, usa
 * fallback ingênuo (primeira palavra = modelo) e marca cada versão criada
 * com confidence menor + nota explícita, para revisão humana priorizada.
 */

const FIPE_BASE = "https://parallelum.com.br/fipe/api/v1/carros/marcas";
/** 200ms (5 req/s) provocava HTTP 429 em massa a partir de ~150-200
 * chamadas consecutivas em catálogos grandes (confirmado com Nissan, 200
 * modelos) — a API gratuita da FIPE não documenta o limite real, então o
 * valor foi ajustado para ficar bem abaixo do que já se mostrou
 * insustentável. Afeta toda montadora, não só a que expôs o problema. */
const REQUEST_DELAY_MS = 1_100;
const CURRENT_YEAR = new Date().getFullYear();
const FIPE_ZERO_KM_SENTINEL = 32000;
/** Sem isto, uma conexão que trava sem responder (nem erro, nem 429)
 * prende a normalização inteira indefinidamente — mesmo raciocínio já
 * aplicado às requisições do crawler (services/intelligentCrawler.ts). */
const FIPE_REQUEST_TIMEOUT_MS = 20_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A FIPE (parallelum.com.br) é uma API pública gratuita com rate limit
 * agressivo — em catálogos grandes (200+ modelos), o intervalo fixo
 * REQUEST_DELAY_MS sozinho não é suficiente e uma fração relevante das
 * chamadas volta com HTTP 429. Backoff exponencial (respeitando
 * Retry-After quando enviado, até um teto sensato) recupera essas
 * chamadas em vez de desistir e deixar o VehicleModel sem versões
 * estruturadas. */
const MAX_RETRIES_429 = 5;
/** Teto para o quanto este processo respeita um Retry-After enviado pelo
 * servidor. Confirmado na prática: depois de uma sequência de 429s, o
 * Cloudflare na frente da FIPE chegou a mandar `retry-after: 73860`
 * (~20,5 HORAS) — obedecer isso literalmente prende a normalização
 * inteira (e, por extensão, o pipeline de toda montadora seguinte) por
 * um dia inteiro. Acima do teto, a chamada falha rápido (o modelo fica
 * pendente, resolvido numa execução futura já sem bloqueio) em vez de
 * bloquear a execução atual. */
const MAX_RETRY_AFTER_S = 30;

async function fetchJson<T>(url: string): Promise<T> {
  for (let tentativa = 0; ; tentativa++) {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FIPE_REQUEST_TIMEOUT_MS),
    });
    if (res.ok) return res.json() as Promise<T>;
    if (res.status === 429 && tentativa < MAX_RETRIES_429) {
      const retryAfterHeader = Number(res.headers.get("retry-after"));
      if (Number.isFinite(retryAfterHeader) && retryAfterHeader > MAX_RETRY_AFTER_S) {
        throw new Error(
          `HTTP 429 em ${url} (retry-after=${retryAfterHeader}s — bloqueio prolongado sinalizado pelo servidor, não vale esperar nesta execução)`
        );
      }
      const esperaMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader * 1000
        : 2 ** tentativa * 1000;
      await sleep(esperaMs);
      continue;
    }
    throw new Error(`HTTP ${res.status} em ${url}`);
  }
}

/** Catálogo FIPE (marcas/modelos/anos disponíveis) muda pouco — não é o
 * preço mensal, é a estrutura do catálogo. 7 dias equilibra evitar
 * chamadas redundantes (a causa raiz do HTTP 429 em massa documentado
 * acima) contra pegar atualizações reais de catálogo num prazo razoável. */
const FIPE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Mesmo resultado de fetchJson, mas passando por ExternalCache
 * (provider=FIPE, cacheKey=url) primeiro — reduz drasticamente as
 * chamadas repetidas à API gratuita da FIPE entre execuções/retentativas
 * do mesmo catálogo, a causa raiz do rate-limit em massa já documentado.
 * `fromCache` informa o chamador para pular o sleep de rate-limit quando
 * nenhuma chamada de rede real aconteceu.
 */
async function fetchJsonCached<T>(prisma: PrismaClient, url: string): Promise<CachedResult<T>> {
  return getCachedOrFetch(prisma, "FIPE", url, FIPE_CACHE_TTL_MS, () => fetchJson<T>(url));
}

const FUEL_MAP: Record<string, "GASOLINA" | "DIESEL" | "FLEX" | "HIBRIDO" | "ELETRICO"> = {
  Gasolina: "GASOLINA",
  Diesel: "DIESEL",
  Flex: "FLEX",
  Híbrido: "HIBRIDO",
  "Elétrico": "ELETRICO",
};

function detectTransmission(text: string): "AUTOMATICA" | "MANUAL" | null {
  if (/\baut\.?\b/i.test(text)) return "AUTOMATICA";
  if (/\bmec\.?\b/i.test(text)) return "MANUAL";
  return null;
}

function detectDrivetrain(text: string): "INTEGRAL" | null {
  return /4x4/i.test(text) ? "INTEGRAL" : null;
}

function deriveEngineName(version: string, fuelRaw: string): string {
  let s = version;
  s = s.replace(/\(?\bh[ií]brido\)?/gi, "");
  s = s.replace(/\bflex\b/gi, "");
  s = s.replace(/\bdiesel\b/gi, "");
  s = s.replace(/\bgasolina\b/gi, "");
  s = s.replace(/\bel[eé]trico\b/gi, "");
  s = s.replace(/\b4x4\b|\b4x2\b/gi, "");
  s = s.replace(/\baut\.?\b/gi, "");
  s = s.replace(/\bmec\.?\b/gi, "");
  s = s.replace(/\s{2,}/g, " ").trim().replace(/^[/\s-]+|[/\s-]+$/g, "");
  return s || fuelRaw;
}

function splitName(
  name: string,
  hints: ReturnType<typeof getNameplateHints>
): { base: string; version: string; usedFallback: boolean } {
  if (hints) {
    const lower = name.toLowerCase();
    for (const prefix of hints.prefixes) {
      const pLower = prefix.toLowerCase();
      if (lower.startsWith(pLower)) {
        const nextChar = name.charAt(prefix.length);
        const isWordBoundary = prefix.endsWith(".") || nextChar === "" || nextChar === " ";
        if (!isWordBoundary) continue;
        const base = hints.canonical?.[pLower] ?? prefix;
        const version = name.slice(prefix.length).trim();
        return { base, version, usedFallback: false };
      }
    }
  }
  // Fallback ingênuo: primeira palavra. Correto para nameplates de uma
  // palavra só (maioria das montadoras); marcado usedFallback=true para o
  // chamador rebaixar a confiança quando não há hints configurados.
  const firstSpace = name.indexOf(" ");
  if (firstSpace === -1) return { base: name, version: "", usedFallback: true };
  return { base: name.slice(0, firstSpace), version: name.slice(firstSpace + 1).trim(), usedFallback: true };
}

export type FipeCatalogResult = {
  manufacturerName: string;
  totalFipeModelos: number;
  jaEstruturados: number;
  jaProcessadosAnteriormente: number;
  processados: number;
  modelsCreated: number;
  modelsReused: number;
  versionsCreated: number;
  errors: number;
  usedFallbackSplitCount: number;
  errorDetails: { id: number; name: string; error: string }[];
};

export async function normalizeManufacturerFipeCatalog(
  prisma: PrismaClient,
  manufacturerName: string
): Promise<FipeCatalogResult> {
  const manufacturer = await prisma.manufacturer.findFirst({
    where: { name: { equals: manufacturerName, mode: "insensitive" } },
  });
  if (!manufacturer) {
    throw new Error(
      `Manufacturer "${manufacturerName}" não encontrado — crie o fabricante antes de rodar a normalização de catálogo.`
    );
  }

  const hints = getNameplateHints(manufacturer.name);

  const allModels = await prisma.vehicleModel.findMany({
    where: { manufacturerId: manufacturer.id },
    include: { _count: { select: { versions: true } } },
  });

  const jaEstruturados = allModels.filter((m) => m._count.versions > 0 && !m.deletedAt).length;
  const jaProcessados = allModels.filter((m) => m.deletedAt).length;
  const candidatos = allModels.filter((m) => m._count.versions === 0 && !m.deletedAt);

  if (candidatos.length === 0) {
    return {
      manufacturerName: manufacturer.name,
      totalFipeModelos: allModels.length,
      jaEstruturados,
      jaProcessadosAnteriormente: jaProcessados,
      processados: 0,
      modelsCreated: 0,
      modelsReused: 0,
      versionsCreated: 0,
      errors: 0,
      usedFallbackSplitCount: 0,
      errorDetails: [],
    };
  }

  const { value: marcas } = await fetchJsonCached<{ codigo: string; nome: string }[]>(prisma, FIPE_BASE);
  const marca = marcas.find((m) => m.nome.trim().toLowerCase() === manufacturer.name.trim().toLowerCase());
  if (!marca) {
    throw new Error(`Montadora "${manufacturer.name}" não encontrada na tabela FIPE atual (parallelum.com.br).`);
  }

  const { value: modelosData } = await fetchJsonCached<{ modelos: { codigo: number; nome: string }[] }>(
    prisma,
    `${FIPE_BASE}/${marca.codigo}/modelos`
  );
  const nameToCodigo = new Map(modelosData.modelos.map((m) => [m.nome.trim(), m.codigo]));

  const baseModelIdCache = new Map<string, number>();
  let modelsCreated = 0;
  let modelsReused = 0;
  let versionsCreated = 0;
  let errors = 0;
  let usedFallbackSplitCount = 0;
  const errorDetails: { id: number; name: string; error: string }[] = [];

  for (const model of candidatos) {
    try {
      const codigo = nameToCodigo.get(model.name.trim());
      if (!codigo) {
        throw new Error(`não encontrado na lista atual de modelos FIPE da montadora (pode ter saído do catálogo)`);
      }

      const { value: anos, fromCache } = await fetchJsonCached<{ codigo: string; nome: string }[]>(
        prisma,
        `${FIPE_BASE}/${marca.codigo}/modelos/${codigo}/anos`
      );
      const parsed = anos
        .map((a) => {
          const [yearStr, ...fuelParts] = a.nome.split(" ");
          return { year: parseInt(yearStr, 10), fuelRaw: fuelParts.join(" ") };
        })
        .filter((p) => !Number.isNaN(p.year));
      // Sem chamada de rede real (cache hit), não há rate-limit para
      // respeitar — pular o sleep evita esperar minutos à toa numa
      // reexecução totalmente em cache (200 modelos × 1.1s > 3min).
      if (!fromCache) await sleep(REQUEST_DELAY_MS);

      if (parsed.length === 0) throw new Error("FIPE não retornou nenhum ano/combustível válido para este código");

      const fuels = [...new Set(parsed.map((p) => p.fuelRaw))];
      const fuelRaw = fuels.length === 1 ? fuels[0] : parsed.sort((a, b) => b.year - a.year)[0].fuelRaw;
      const fuel = FUEL_MAP[fuelRaw];
      if (!fuel) throw new Error(`combustível "${fuelRaw}" não mapeia para nenhum FuelType conhecido`);

      const realYears = parsed.map((p) => p.year).filter((y) => y !== FIPE_ZERO_KM_SENTINEL);
      const hasSentinel = parsed.some((p) => p.year === FIPE_ZERO_KM_SENTINEL);
      const yearStart = realYears.length ? Math.min(...realYears) : CURRENT_YEAR;
      const yearEnd = hasSentinel ? CURRENT_YEAR : Math.max(...realYears);

      const { base, version, usedFallback } = splitName(model.name, hints);
      if (usedFallback) usedFallbackSplitCount++;
      const versionName = version || model.name;

      // Resolução canônica (lib/masterData/resolveVehicleModel.ts) — chave
      // de cache normalizada (minúsculas, sem acento) via
      // normalizeLookupKey, mesma função usada pelo find-or-create
      // real. Sem isso, "City"/"CITY", "WR-V"/"Wr-v" (casing inconsistente
      // já usado pela própria FIPE entre anos do mesmo modelo) ou
      // "Mégane"/"Megane" (acento) viram VehicleModel distintos — os 3
      // primeiros pares já existiam duplicados na base antes desta etapa e
      // foram mesclados manualmente.
      const baseKey = normalizeLookupKey(base);
      let baseModelId: number;
      if (baseModelIdCache.has(baseKey)) {
        baseModelId = baseModelIdCache.get(baseKey)!;
      } else {
        const existingCount = await prisma.vehicleModel.count({
          where: { manufacturerId: manufacturer.id, normalizedName: baseKey },
        });
        baseModelId = await findOrCreateVehicleModelId(prisma, manufacturer.id, base);
        if (existingCount > 0) modelsReused++;
        else modelsCreated++;
        baseModelIdCache.set(baseKey, baseModelId);
      }

      const transmissionType = detectTransmission(model.name);
      const transmissionId = transmissionType
        ? (
            (await prisma.transmission.findFirst({ where: { type: transmissionType, gears: null, description: null } })) ??
            (await prisma.transmission.create({ data: { type: transmissionType, gears: null, description: null } }))
          ).id
        : null;

      const engineName = deriveEngineName(version, fuelRaw);
      const engine =
        (await prisma.engine.findFirst({ where: { name: engineName, fuel, power: null } })) ??
        (await prisma.engine.create({ data: { name: engineName, fuel, power: null, turbo: /turbo/i.test(engineName) } }));

      const drivetrain = detectDrivetrain(model.name);
      const source = `FIPE (parallelum.com.br) — código ${codigo}, modelo original: "${model.name}"${
        usedFallback ? " [split ingênuo, sem hints de nameplate configurados]" : ""
      }`;

      const version_ =
        (await prisma.vehicleVersion.findFirst({ where: { vehicleModelId: baseModelId, name: versionName, engineId: engine.id } })) ??
        (await prisma.vehicleVersion.create({
          data: {
            vehicleModelId: baseModelId,
            engineId: engine.id,
            transmissionId,
            name: versionName,
            yearStart,
            yearEnd,
            category: "NAO_CONFIRMADO",
            drivetrain,
            country: "Brasil",
            notes: usedFallback
              ? "Split modelo/versão feito por heurística ingênua (sem hints de nameplate cadastrados para esta montadora) — revisar manualmente se o nome do modelo parecer incompleto. Carroceria não confirmada."
              : "Carroceria não confirmada por nenhuma fonte ainda (FIPE não informa) — aguardando documentação oficial ou outra fonte confiável.",
            isActive: hasSentinel,
            validationStatus: "NECESSITA_VALIDACAO",
            source,
            confidence: usedFallback ? 40 : 55,
          },
        }));
      if (version_.createdAt.getTime() === version_.updatedAt.getTime()) {
        versionsCreated++;
        await prisma.auditLog.create({
          data: {
            entity: "VehicleVersion",
            entityId: version_.id,
            action: "CREATE",
            changes: JSON.stringify({ origem: "normalização FIPE (manufacturer:import)", vehicleModelOriginalId: model.id, base, version: versionName, fipeCodigo: codigo }),
          },
        });
      }

      await prisma.vehicleModel.update({
        where: { id: model.id },
        data: {
          deletedAt: new Date(),
          notes: `Migrado em ${new Date().toISOString().slice(0, 10)}: normalizado para VehicleModel "${base}" (id ${baseModelId}) + VehicleVersion "${versionName}" (id ${version_.id}). Registro original preservado (soft delete), nunca apagado.`,
        },
      });
      await prisma.auditLog.create({
        data: {
          entity: "VehicleModel",
          entityId: model.id,
          action: "UPDATE",
          changes: JSON.stringify({ acao: "soft-delete pos-normalizacao", novoModeloId: baseModelId, novaVersaoId: version_.id }),
        },
      });
    } catch (e) {
      errors++;
      errorDetails.push({ id: model.id, name: model.name, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return {
    manufacturerName: manufacturer.name,
    totalFipeModelos: allModels.length,
    jaEstruturados,
    jaProcessadosAnteriormente: jaProcessados,
    processados: candidatos.length,
    modelsCreated,
    modelsReused,
    versionsCreated,
    errors,
    usedFallbackSplitCount,
    errorDetails,
  };
}
