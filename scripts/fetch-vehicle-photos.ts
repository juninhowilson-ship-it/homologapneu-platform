import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buscarInfoboxModelo } from "../lib/importer/connectors/wikipediaVeiculoInfobox";
import {
  isStorageConfigured,
  ensureLogoBucketsExist,
  uploadImageFromUrl,
  BUCKET_VEHICLE_IMAGES,
} from "../lib/storage/supabaseStorage";

/**
 * Busca foto real (Wikipédia PT, infobox "Info/Automóvel") para todo
 * VehicleModel sem foto — sem filtrar por "nome limpo": a sessão
 * descobriu que boa parte do campo VehicleModel.name é na verdade uma
 * versão/trim inteira (herdado de importações FIPE antigas), mas nenhum
 * regex separa isso de forma confiável, e tentar não custa nada (só não
 * bate com nenhum artigo — nunca inventa, nunca grava nada quando não
 * encontra). Decisão do usuário: rodar sem filtro nos 8216 e aceitar a
 * taxa de acerto real.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadComRetry(bucket: string, path: string, sourceUrl: string, delayMs: number) {
  await sleep(delayMs);
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      return await uploadImageFromUrl(bucket, path, sourceUrl);
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : String(error);
      if (!mensagem.includes("429") || tentativa === 3) throw error;
      await sleep(delayMs * tentativa * 5);
    }
  }
  throw new Error("unreachable");
}

async function main() {
  if (!isStorageConfigured()) {
    console.log("Supabase Storage não configurado — abortando.");
    return;
  }
  await ensureLogoBucketsExist();

  const modelos = await prisma.vehicleModel.findMany({
    where: { photoUrl: null },
    include: { manufacturer: true },
    orderBy: { id: "asc" },
  });

  const limite = process.argv[2] ? Number(process.argv[2]) : undefined;
  const alvo = limite ? modelos.slice(0, limite) : modelos;

  console.log(`${modelos.length} sem foto` + (limite ? ` (rodando só os primeiros ${alvo.length}, teste)` : ""));

  let encontrados = 0;
  let semImagem = 0;
  let semArtigo = 0;
  let reenviados = 0;
  const erros: { modelo: string; erro: string }[] = [];

  for (const [index, v] of alvo.entries()) {
    if ((index + 1) % 100 === 0) {
      console.log(`... ${index + 1}/${alvo.length} (${encontrados} encontrados, ${reenviados} hospedados)`);
    }

    let info;
    try {
      info = await buscarInfoboxModelo(v.manufacturer.name, v.name);
    } catch (error) {
      erros.push({ modelo: `${v.manufacturer.name} ${v.name}`, erro: error instanceof Error ? error.message : String(error) });
      continue;
    }

    if (!info) {
      semArtigo++;
      continue;
    }
    if (!info.imageUrl) {
      semImagem++;
      continue;
    }
    encontrados++;

    try {
      const armazenado = await uploadComRetry(BUCKET_VEHICLE_IMAGES, `modelos/${v.id}.jpg`, info.imageUrl, 3000);
      await prisma.vehicleModel.update({ where: { id: v.id }, data: { photoUrl: armazenado.publicUrl } });
      reenviados++;
    } catch (error) {
      erros.push({ modelo: `${v.manufacturer.name} ${v.name}`, erro: error instanceof Error ? error.message : String(error) });
    }
  }

  console.log("=== RESUMO ===");
  console.log(JSON.stringify({
    total: alvo.length,
    comArtigoEImagem: encontrados,
    hospedados: reenviados,
    semArtigo,
    semImagemNoInfobox: semImagem,
    falhas: erros.length,
    exemplosFalhas: erros.slice(0, 20),
  }, null, 2));
}

main()
  .catch((e) => { console.error("Falha geral:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
