import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Integração com Supabase Storage para hospedar imagens reais (logos de
 * montadora/fabricante de pneu, fotos de veículo/pneu) coletadas de fontes
 * públicas verificadas (ex.: Wikimedia Commons via Wikidata).
 *
 * Requer duas variáveis de ambiente que NÃO existem hoje neste projeto
 * (apenas DATABASE_URL/DIRECT_URL do Postgres estão configuradas — a
 * connection string do banco não serve como credencial da API de Storage):
 *   - SUPABASE_URL: URL do projeto (ex.: https://<ref>.supabase.co)
 *   - SUPABASE_SERVICE_ROLE_KEY: chave service_role (necessária para
 *     upload; a chave anon não tem permissão de escrita por padrão)
 *
 * Enquanto essas variáveis não forem fornecidas, isConfigured() retorna
 * false e nenhuma chamada de rede é feita — mesmo padrão já usado pelos
 * conectores de importação para fontes sem credencial disponível.
 */

export const BUCKET_LOGOS = "logos";
export const BUCKET_VEHICLE_IMAGES = "vehicle-images";
export const BUCKET_TIRE_IMAGES = "tire-images";

export function isStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let cachedClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!isStorageConfigured()) {
    throw new Error(
      "Supabase Storage não configurado: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env antes de chamar esta função."
    );
  }
  if (!cachedClient) {
    cachedClient = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false } }
    );
  }
  return cachedClient;
}

export type StoredImage = {
  path: string;
  publicUrl: string;
  contentType: string;
  sizeBytes: number;
};

/**
 * Baixa uma imagem de uma URL de origem real (nunca gerada/inventada) e a
 * re-hospeda no bucket informado, retornando a URL pública definitiva.
 * Lança erro se a origem não responder com um Content-Type de imagem — a
 * regra de "nunca inventar dados" também vale para imagens: só armazenamos
 * bytes que realmente vieram da fonte.
 */
export async function uploadImageFromUrl(
  bucket: string,
  path: string,
  sourceUrl: string
): Promise<StoredImage> {
  const client = getClient();

  const response = await fetch(sourceUrl, {
    headers: { "User-Agent": "HomologaPneu-DataImport/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Falha ao baixar imagem de origem (${sourceUrl}): HTTP ${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error(
      `URL de origem (${sourceUrl}) não retornou uma imagem (Content-Type: "${contentType}").`
    );
  }
  const bytes = await response.arrayBuffer();

  const { error } = await client.storage
    .from(bucket)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) {
    throw new Error(`Falha ao enviar imagem para o Supabase Storage (${bucket}/${path}): ${error.message}`);
  }

  const { data } = client.storage.from(bucket).getPublicUrl(path);

  return {
    path,
    publicUrl: data.publicUrl,
    contentType,
    sizeBytes: bytes.byteLength,
  };
}
