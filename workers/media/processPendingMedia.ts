import "server-only";
import { prisma } from "@/lib/prisma";
import { baixarImagem } from "@/services/media/mediaDownloader";
import { processarImagem } from "@/services/media/imageProcessor";
import { gerarThumbnail } from "@/services/media/thumbnailGenerator";
import { detectarDuplicata } from "@/services/media/duplicateDetector";
import { resolverContextoDeVinculo } from "@/services/media/linkResolver";
import { buildFileName } from "@/lib/media/naming";
import { BUCKET_BY_MEDIA_TYPE } from "@/lib/media/constants";
import { uploadMediaFile, isMediaStorageConfigured } from "@/storage/mediaStorage";
import { updateMedia, clearOtherPrimaryMedia } from "@/repositories/media/media";

/**
 * ATENÇÃO — infraestrutura preparada, mas INERTE por design: nada neste
 * projeto chama processarPendentes() automaticamente (sem cron, sem
 * trigger em nenhuma rota). "Preparar para futuro crawler... NÃO baixar
 * imagens ainda" (pedido explícito) — isto existe pronto para quando um
 * crawler de mídia de verdade for construído e decidir chamá-lo (manual
 * ou agendado), com o mesmo padrão de fila cooperativa dos workers do
 * Intelligent Crawler existente, mas 100% isolado dele (nenhuma tabela ou
 * módulo do crawler de homologações é lido ou escrito aqui).
 */
export type ResultadoProcessamento = {
  processados: number;
  sucesso: number;
  duplicados: number;
  erros: { id: number; erro: string }[];
};

export async function processarPendentes(limite = 10): Promise<ResultadoProcessamento> {
  const pendentes = await prisma.media.findMany({
    where: { status: "PENDENTE", originalUrl: { not: null } },
    take: limite,
    orderBy: { createdAt: "asc" },
  });

  const resultado: ResultadoProcessamento = {
    processados: pendentes.length,
    sucesso: 0,
    duplicados: 0,
    erros: [],
  };

  for (const media of pendentes) {
    try {
      await updateMedia(media.id, { status: "PROCESSANDO" });

      const baixada = await baixarImagem(media.originalUrl as string);

      const duplicata = await detectarDuplicata({ sha256: baixada.sha256 });
      if (duplicata.isDuplicate) {
        await updateMedia(media.id, { status: "DUPLICADO", sha256: baixada.sha256 });
        resultado.duplicados += 1;
        continue;
      }

      if (!isMediaStorageConfigured()) {
        throw new Error("Supabase Storage não configurado");
      }

      const naming = await resolverContextoDeVinculo(media.type, media);
      const processed = await processarImagem(baixada.buffer, baixada.mimeType);
      const thumbnail = await gerarThumbnail(baixada.buffer);

      const bucket = BUCKET_BY_MEDIA_TYPE[media.type];
      const isSvg = baixada.mimeType === "image/svg+xml";
      const fileId = crypto.randomUUID();
      const fileName = buildFileName(naming, fileId, isSvg ? "svg" : "webp");
      const bytesToStore = isSvg
        ? baixada.buffer
        : (processed.variants.find((v) => v.width === 1280) ?? processed.variants.at(-1))
            ?.buffer ?? baixada.buffer;

      const mainUpload = await uploadMediaFile(
        bucket,
        fileName,
        bytesToStore,
        isSvg ? "image/svg+xml" : "image/webp"
      );
      const thumbFileName = fileName.replace(/\.(webp|svg)$/, "-thumb.webp");
      const thumbUpload = await uploadMediaFile("thumbnails", thumbFileName, thumbnail.buffer, "image/webp");

      await updateMedia(media.id, {
        storageUrl: mainUpload.publicUrl,
        thumbnailUrl: thumbUpload.publicUrl,
        sha256: baixada.sha256,
        mimeType: baixada.mimeType,
        width: processed.original.width || thumbnail.width,
        height: processed.original.height || thumbnail.height,
        size: bytesToStore.byteLength,
        status: "DISPONIVEL",
      });

      if (media.isPrimary) {
        await clearOtherPrimaryMedia(media, media.type, media.id);
      }

      resultado.sucesso += 1;
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : "Erro desconhecido";
      await updateMedia(media.id, { status: "ERRO" }).catch(() => {});
      resultado.erros.push({ id: media.id, erro: mensagem });
    }
  }

  return resultado;
}
