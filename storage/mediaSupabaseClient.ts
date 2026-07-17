import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase Storage dedicado ao Media Manager — módulo próprio
 * (não importa nem reaproveita lib/storage/supabaseStorage.ts, usado pelo
 * rehost de logos existente) ainda que aponte para o mesmo projeto
 * Supabase via as mesmas duas variáveis de ambiente (SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY) — não há um segundo projeto Supabase, só
 * buckets/tabela novos e isolados dentro do mesmo projeto.
 *
 * Enquanto essas variáveis não existirem em .env, isMediaStorageConfigured()
 * retorna false e nenhuma chamada de rede é feita — mesmo padrão já usado
 * em todo o projeto para integrações sem credencial disponível.
 */
export function isMediaStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let cachedClient: SupabaseClient | null = null;

export function getMediaSupabaseClient(): SupabaseClient {
  if (!isMediaStorageConfigured()) {
    throw new Error(
      "Media Manager: Supabase Storage não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env."
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
