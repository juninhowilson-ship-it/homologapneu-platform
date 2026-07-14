import "server-only";
import { prisma } from "@/lib/prisma";
import { isStorageConfigured, uploadImageFromUrl, BUCKET_LOGOS } from "./supabaseStorage";

/**
 * Baixa os logos reais já identificados via Wikidata (campo logoUrl das
 * montadoras e fabricantes de pneu, apontando para o Wikimedia Commons) e
 * os re-hospeda no Supabase Storage, substituindo o logoUrl pela URL
 * pública definitiva do projeto.
 *
 * Não cria/atualiza registros de negócio (Manufacturer/TireManufacturer já
 * existem — só troca a URL da imagem), por isso não usa o pipeline de
 * ImportBatch/AuditLog: não há uma entidade "IMAGENS" no enum ImportEntity
 * e criar uma só para esta operação seria prematuro enquanto o Storage
 * está sem credenciais e nunca rodou de verdade.
 *
 * Se SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não estiverem configurados,
 * retorna imediatamente sem fazer nenhuma chamada de rede — mesmo padrão
 * `isConfigured()` usado pelos conectores de importação.
 */

export type RehostResultado = {
  configurado: boolean;
  processados: number;
  reenviados: number;
  erros: { entidade: string; nome: string; erro: string }[];
};

function isJaHospedadoNoSupabase(url: string): boolean {
  return url.includes(".supabase.co/storage/");
}

export async function rehospedarLogos(): Promise<RehostResultado> {
  if (!isStorageConfigured()) {
    return { configurado: false, processados: 0, reenviados: 0, erros: [] };
  }

  const erros: RehostResultado["erros"] = [];
  let processados = 0;
  let reenviados = 0;

  const montadoras = await prisma.manufacturer.findMany({
    where: { logoUrl: { not: null } },
    select: { id: true, name: true, logoUrl: true },
  });
  for (const montadora of montadoras) {
    const logoUrl = montadora.logoUrl as string;
    if (isJaHospedadoNoSupabase(logoUrl)) continue;
    processados += 1;
    try {
      const armazenado = await uploadImageFromUrl(
        BUCKET_LOGOS,
        `montadoras/${montadora.id}.png`,
        logoUrl
      );
      await prisma.manufacturer.update({
        where: { id: montadora.id },
        data: { logoUrl: armazenado.publicUrl },
      });
      reenviados += 1;
    } catch (error) {
      erros.push({
        entidade: "Manufacturer",
        nome: montadora.name,
        erro: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const fabricantes = await prisma.tireManufacturer.findMany({
    where: { logoUrl: { not: null } },
    select: { id: true, name: true, logoUrl: true },
  });
  for (const fabricante of fabricantes) {
    const logoUrl = fabricante.logoUrl as string;
    if (isJaHospedadoNoSupabase(logoUrl)) continue;
    processados += 1;
    try {
      const armazenado = await uploadImageFromUrl(
        BUCKET_LOGOS,
        `fabricantes-pneus/${fabricante.id}.png`,
        logoUrl
      );
      await prisma.tireManufacturer.update({
        where: { id: fabricante.id },
        data: { logoUrl: armazenado.publicUrl },
      });
      reenviados += 1;
    } catch (error) {
      erros.push({
        entidade: "TireManufacturer",
        nome: fabricante.name,
        erro: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { configurado: true, processados, reenviados, erros };
}
