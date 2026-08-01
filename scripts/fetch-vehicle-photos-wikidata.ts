import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { sparqlQuery, sparqlStringLiteral, chunk } from "../lib/importer/connectors/wikidataClient";
import {
  isStorageConfigured,
  ensureLogoBucketsExist,
  uploadImageFromUrl,
  BUCKET_VEHICLE_IMAGES,
} from "../lib/storage/supabaseStorage";
import { normalizeLookupKey } from "../lib/masterData/normalizeName";

/**
 * Segunda fonte de foto de veículo (depois da Wikipédia PT, que teve
 * cobertura muito baixa): Wikidata, restrito aos VehicleModel que já têm
 * uso real no sistema (Homologation ou ManufacturerApplication) — 792
 * modelos, não os 8215 crus. Resolve o QID de cada montadora (mesma
 * lógica de wikidataMontadoras.ts), depois busca TODOS os modelos dessa
 * montadora (P176) de uma vez e casa localmente pelo nome normalizado —
 * mais eficiente que uma consulta por modelo.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const AUTOMOBILE_MANUFACTURER_CLASS = "wd:Q786820";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Falha rápido (1 retry curto) em vez de insistir muito num item só —
 * mais barato relançar o script inteiro (idempotente, só reprocessa
 * quem ainda está com photoUrl null) do que gastar minutos numa única
 * imagem persistentemente bloqueada.
 */
async function uploadComRetry(bucket: string, path: string, sourceUrl: string, delayMs: number) {
  await sleep(delayMs);
  try {
    return await uploadImageFromUrl(bucket, path, sourceUrl);
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error);
    if (!mensagem.includes("429")) throw error;
    await sleep(delayMs * 3);
    return await uploadImageFromUrl(bucket, path, sourceUrl);
  }
}

async function resolverQidsMontadoras(nomes: string[]): Promise<Map<string, string>> {
  const qidPorNome = new Map<string, string>();
  for (const batch of chunk(nomes, 40)) {
    const values = batch.map(sparqlStringLiteral).join(" ");
    const query = `
SELECT ?nameIn ?item WHERE {
  VALUES ?nameIn { ${values} }
  ?item rdfs:label ?rawLabel .
  FILTER(STR(?rawLabel) = ?nameIn)
  ?item wdt:P31/wdt:P279* ${AUTOMOBILE_MANUFACTURER_CLASS} .
}`;
    let bindings;
    try {
      bindings = await sparqlQuery(query);
    } catch {
      await sleep(3000);
      bindings = await sparqlQuery(query);
    }
    for (const b of bindings) {
      const nome = b.nameIn?.value;
      const qid = b.item?.value?.split("/").pop();
      if (nome && qid && !qidPorNome.has(nome)) qidPorNome.set(nome, qid);
    }
  }
  return qidPorNome;
}

async function buscarModelosDaMontadora(qid: string): Promise<{ label: string; image: string | null }[]> {
  const query = `
SELECT ?modelLabel ?image WHERE {
  ?model wdt:P176 wd:${qid} .
  ?model rdfs:label ?modelLabel .
  FILTER(LANG(?modelLabel) = "en" || LANG(?modelLabel) = "pt")
  OPTIONAL { ?model wdt:P18 ?image }
}`;
  let bindings;
  try {
    bindings = await sparqlQuery(query);
  } catch {
    await sleep(3000);
    bindings = await sparqlQuery(query);
  }
  return bindings
    .filter((b) => b.image?.value)
    .map((b) => ({ label: b.modelLabel!.value, image: b.image!.value }));
}

async function main() {
  if (!isStorageConfigured()) {
    console.log("Supabase Storage não configurado — abortando.");
    return;
  }
  await ensureLogoBucketsExist();

  const alvo = await prisma.vehicleModel.findMany({
    where: {
      photoUrl: null,
      OR: [
        { versions: { some: { homologations: { some: {} } } } },
        { manufacturerApplications: { some: {} } },
      ],
    },
    include: { manufacturer: true },
  });
  console.log(`${alvo.length} veículos reais ainda sem foto (após a passada da Wikipédia)`);

  const manufacturerNomes = Array.from(new Set(alvo.map((v) => v.manufacturer.name)));
  const qidPorMontadora = await resolverQidsMontadoras(manufacturerNomes);
  console.log(`${qidPorMontadora.size}/${manufacturerNomes.length} montadoras resolvidas no Wikidata`);

  let encontrados = 0;
  let hospedados = 0;
  const erros: { modelo: string; erro: string }[] = [];
  const semMatch: string[] = [];

  let montadoraIndex = 0;
  for (const manufacturerNome of manufacturerNomes) {
    montadoraIndex++;
    const qid = qidPorMontadora.get(manufacturerNome);
    if (!qid) continue;

    const modelosDoAlvo = alvo.filter((v) => v.manufacturer.name === manufacturerNome);
    const modelosWikidata = await buscarModelosDaMontadora(qid);
    await sleep(800);

    const imagemPorNomeNormalizado = new Map<string, string>();
    for (const m of modelosWikidata) {
      const chave = normalizeLookupKey(m.label);
      if (m.image && !imagemPorNomeNormalizado.has(chave)) imagemPorNomeNormalizado.set(chave, m.image);
    }

    for (const v of modelosDoAlvo) {
      // Tenta "Modelo" puro e "Marca Modelo" (Wikidata costuma rotular
      // com o nome completo, ex.: "Volkswagen Golf", não só "Golf").
      const candidatos = [v.name, `${v.manufacturer.name} ${v.name}`].map(normalizeLookupKey);
      const imageUrl = candidatos.map((c) => imagemPorNomeNormalizado.get(c)).find(Boolean);

      if (!imageUrl) {
        semMatch.push(`${manufacturerNome} ${v.name}`);
        continue;
      }
      encontrados++;

      try {
        const armazenado = await uploadComRetry(BUCKET_VEHICLE_IMAGES, `modelos/${v.id}.jpg`, imageUrl, 4000);
        await prisma.vehicleModel.update({ where: { id: v.id }, data: { photoUrl: armazenado.publicUrl } });
        hospedados++;
      } catch (error) {
        erros.push({ modelo: `${manufacturerNome} ${v.name}`, erro: error instanceof Error ? error.message : String(error) });
      }
    }

    if (montadoraIndex % 20 === 0) {
      console.log(`... ${montadoraIndex}/${manufacturerNomes.length} montadoras (${encontrados} encontrados, ${hospedados} hospedados)`);
    }
  }

  console.log("=== RESUMO ===");
  console.log(JSON.stringify({
    veiculosAlvo: alvo.length,
    montadorasResolvidas: qidPorMontadora.size,
    encontrados,
    hospedados,
    falhas: erros.length,
    semMatchAmostra: semMatch.slice(0, 30),
  }, null, 2));
}

main()
  .catch((e) => { console.error("Falha geral:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
