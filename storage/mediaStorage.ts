import "server-only";
import { getMediaSupabaseClient, isMediaStorageConfigured } from "./mediaSupabaseClient";
import { ALL_MEDIA_BUCKETS, type MediaBucketKey, MEDIA_BUCKETS } from "./buckets";

export { isMediaStorageConfigured, MEDIA_BUCKETS, ALL_MEDIA_BUCKETS };
export type { MediaBucketKey };

/**
 * Cria os buckets do Media Manager que ainda não existirem — idempotente
 * (ignora "already exists"). Só chamada manualmente (painel/CLI); nenhum
 * cron ou inicialização automática dispara isto.
 */
export async function ensureMediaBucketsExist(): Promise<{
  configured: boolean;
  created: string[];
  existing: string[];
}> {
  if (!isMediaStorageConfigured()) {
    return { configured: false, created: [], existing: [] };
  }

  const client = getMediaSupabaseClient();
  const { data: existentes } = await client.storage.listBuckets();
  const nomesExistentes = new Set((existentes ?? []).map((b) => b.name));

  const created: string[] = [];
  const existing: string[] = [];

  for (const bucket of ALL_MEDIA_BUCKETS) {
    if (nomesExistentes.has(bucket)) {
      existing.push(bucket);
      continue;
    }
    const { error } = await client.storage.createBucket(bucket, { public: true });
    if (error && !error.message.toLowerCase().includes("already exists")) {
      throw new Error(`Falha ao criar bucket "${bucket}": ${error.message}`);
    }
    created.push(bucket);
  }

  return { configured: true, created, existing };
}

export async function uploadMediaFile(
  bucket: string,
  path: string,
  bytes: Buffer,
  contentType: string
): Promise<{ publicUrl: string; path: string }> {
  const client = getMediaSupabaseClient();

  const { error } = await client.storage
    .from(bucket)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) {
    throw new Error(`Falha ao enviar para o Supabase Storage (${bucket}/${path}): ${error.message}`);
  }

  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

export async function deleteMediaFile(bucket: string, path: string): Promise<void> {
  const client = getMediaSupabaseClient();
  const { error } = await client.storage.from(bucket).remove([path]);
  if (error) {
    throw new Error(`Falha ao remover do Supabase Storage (${bucket}/${path}): ${error.message}`);
  }
}

export function bucketForKey(key: MediaBucketKey): string {
  return MEDIA_BUCKETS[key];
}
