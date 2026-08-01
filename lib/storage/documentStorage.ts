import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import * as tus from "tus-js-client";

/**
 * Integração com Supabase Storage para os documentos oficiais (PDFs de
 * manuais/catálogos) do pipeline de Curadoria Inteligente/Crawler —
 * substitui o armazenamento anterior em DocumentUpload.fileContent (Bytes
 * no Postgres), que esgotou a cota do banco. Módulo próprio e isolado
 * (não importa storage/mediaSupabaseClient.ts, do Media Manager parado) —
 * mesmo padrão de módulos independentes já usado no projeto — ainda que
 * aponte para o mesmo projeto Supabase via as mesmas duas variáveis de
 * ambiente (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
 *
 * Bucket privado: nenhuma URL pública é gerada. Consumidores (OCR, IA,
 * download no painel) pedem uma signed URL sob demanda, com expiração —
 * nunca persistida no banco, pois ficaria inválida com o tempo.
 */

export const DOCUMENTS_BUCKET = "documents";

export function isDocumentStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let cachedClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!isDocumentStorageConfigured()) {
    throw new Error(
      "Document Storage: Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env."
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

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const EXTENSION_BY_TYPE: Record<string, string> = {
  PDF: "pdf",
  XLSX: "xlsx",
  CSV: "csv",
};

const MIME_BY_TYPE: Record<string, string> = {
  PDF: "application/pdf",
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  CSV: "text/csv",
};

export function mimeTypeForFileType(fileType: string): string {
  return MIME_BY_TYPE[fileType] ?? "application/octet-stream";
}

/** Nome de pasta determinístico a partir do fabricante declarado — só
 * minúsculas/ASCII/hífen, nunca inventado (usa "sem-fabricante" quando a
 * fonte não declarou nenhum). */
export function folderNameForManufacturer(manufacturerName: string | null): string {
  if (!manufacturerName) return "sem-fabricante";
  const normalized = manufacturerName
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "sem-fabricante";
}

/** Caminho determinístico do objeto: "{fabricante}/{sha256}.{ext}" — nunca
 * um nome aleatório, para o mesmo arquivo (mesmo hash) sempre cair no
 * mesmo objeto (dedupe natural via upsert). */
export function buildDocumentStoragePath(
  manufacturerName: string | null,
  sha256: string,
  fileType: string
): string {
  const folder = folderNameForManufacturer(manufacturerName);
  const ext = EXTENSION_BY_TYPE[fileType] ?? "bin";
  return `${folder}/${sha256}.${ext}`;
}

/** Cria o bucket privado "documents" se ainda não existir — idempotente. */
export async function ensureDocumentsBucket(): Promise<void> {
  const client = getClient();
  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (listError) {
    throw new Error(`Falha ao listar buckets do Supabase Storage: ${listError.message}`);
  }
  const exists = buckets?.some((b) => b.name === DOCUMENTS_BUCKET);
  if (exists) return;

  const { error: createError } = await client.storage.createBucket(DOCUMENTS_BUCKET, {
    public: false,
  });
  if (createError) {
    throw new Error(`Falha ao criar bucket "${DOCUMENTS_BUCKET}": ${createError.message}`);
  }
}

/** Acima deste tamanho, sobe em pedaços (protocolo TUS/resumable) em vez
 * de um PUT único — mais resiliente a interrupção de rede para arquivos
 * grandes (manuais completos costumam vir na casa de dezenas de MB).
 * Não contorna o limite de tamanho MÁXIMO configurado no projeto Supabase
 * (Dashboard -> Settings -> Storage) — esse teto vale igual para os dois
 * métodos; só ajuda a upload GRANDE mas dentro do limite não falhar por
 * timeout/instabilidade no meio do envio. */
const RESUMABLE_THRESHOLD_BYTES = 6 * 1024 * 1024;

async function uploadDocumentBytesResumable(
  path: string,
  bytes: Uint8Array,
  mimeType: string
): Promise<void> {
  if (!isDocumentStorageConfigured()) {
    throw new Error(
      "Document Storage: Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env."
    );
  }
  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(Buffer.from(bytes), {
      endpoint: `${process.env.SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000],
      headers: {
        authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: { bucketName: DOCUMENTS_BUCKET, objectName: path, contentType: mimeType, cacheControl: "3600" },
      chunkSize: RESUMABLE_THRESHOLD_BYTES,
      onError: reject,
      onSuccess: () => resolve(),
    });
    upload.start();
  });
}

export async function uploadDocumentBytes(
  path: string,
  bytes: Uint8Array,
  mimeType: string
): Promise<void> {
  if (bytes.byteLength > RESUMABLE_THRESHOLD_BYTES) {
    await uploadDocumentBytesResumable(path, bytes, mimeType);
    return;
  }
  const client = getClient();
  const { error } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, bytes, { contentType: mimeType, upsert: true });
  if (error) {
    throw new Error(`Falha ao enviar documento para o Storage (${path}): ${error.message}`);
  }
}

export async function createSignedDocumentUrl(
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const client = getClient();
  const { data, error } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) {
    throw new Error(`Falha ao gerar signed URL (${path}): ${error?.message}`);
  }
  return data.signedUrl;
}

export async function downloadDocumentBytes(path: string): Promise<Uint8Array> {
  const client = getClient();
  const { data, error } = await client.storage.from(DOCUMENTS_BUCKET).download(path);
  if (error || !data) {
    throw new Error(`Falha ao baixar documento do Storage (${path}): ${error?.message}`);
  }
  return new Uint8Array(await data.arrayBuffer());
}

/** Envia + baixa de volta o mesmo objeto e confere o SHA-256 — só depois
 * disso é seguro apagar o binário original de outro lugar. */
export async function uploadAndVerifyDocument(
  path: string,
  bytes: Uint8Array,
  mimeType: string,
  expectedSha256: string
): Promise<void> {
  await uploadDocumentBytes(path, bytes, mimeType);
  const roundTrip = await downloadDocumentBytes(path);
  const actualSha256 = sha256Hex(roundTrip);
  if (actualSha256 !== expectedSha256) {
    throw new Error(
      `Verificação pós-upload falhou para "${path}": hash esperado ${expectedSha256}, obtido ${actualSha256}.`
    );
  }
}
