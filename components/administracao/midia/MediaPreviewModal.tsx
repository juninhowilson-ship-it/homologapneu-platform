"use client";

import { useState } from "react";
import { ImageOff, RefreshCw, Trash2 } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useExcluirMedia, useRegenerarThumbnail } from "@/hooks/useMediaMutations";
import { MEDIA_TYPE_LABELS, MEDIA_STATUS_LABELS, MEDIA_STATUS_TONE } from "./mediaLabels";
import type { MediaDTO } from "@/lib/media/types";

type Props = {
  media: MediaDTO | null;
  onClose: () => void;
};

function formatarBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

export default function MediaPreviewModal({ media, onClose }: Props) {
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const excluir = useExcluirMedia();
  const regenerar = useRegenerarThumbnail();

  if (!media) return null;

  const preview = media.storageUrl ?? media.thumbnailUrl;

  return (
    <>
      <Dialog open={Boolean(media)} onClose={onClose} title={media.title ?? `Mídia #${media.id}`} size="lg">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex aspect-square items-center justify-center rounded-lg border border-border bg-surface-muted">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={media.title ?? ""} className="h-full w-full object-contain" />
            ) : (
              <ImageOff className="text-muted-foreground" size={40} />
            )}
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral">{MEDIA_TYPE_LABELS[media.type]}</Badge>
              <Badge tone={MEDIA_STATUS_TONE[media.status]}>{MEDIA_STATUS_LABELS[media.status]}</Badge>
              {media.isPrimary && <Badge tone="warning">Principal</Badge>}
            </div>

            {media.description && <p className="text-muted-foreground">{media.description}</p>}

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div>
                <p className="text-muted-foreground">Dimensões</p>
                <p className="font-semibold">
                  {media.width && media.height ? `${media.width}×${media.height}px` : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Tamanho</p>
                <p className="font-semibold">{formatarBytes(media.size)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Formato</p>
                <p className="font-semibold">{media.mimeType ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fonte</p>
                <p className="font-semibold">{media.source ?? "—"}</p>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-muted-foreground">SHA-256</p>
              <p className="break-all font-mono text-xs">{media.sha256 ?? "—"}</p>
            </div>

            {media.originalUrl && (
              <div>
                <p className="text-muted-foreground">URL de origem</p>
                <a
                  href={media.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-brand hover:underline"
                >
                  {media.originalUrl}
                </a>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
              <div>
                <span className="block">Criado em</span>
                <span className="text-foreground">{formatarData(media.createdAt)}</span>
              </div>
              <div>
                <span className="block">Atualizado em</span>
                <span className="text-foreground">{formatarData(media.updatedAt)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-border pt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={media.status !== "DISPONIVEL" || regenerar.isPending}
                onClick={() => regenerar.mutate(media.id)}
              >
                <RefreshCw size={14} className="mr-1.5 inline" />
                {regenerar.isPending ? "Regenerando..." : "Regenerar miniatura"}
              </Button>

              <Button
                type="button"
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => setConfirmandoExclusao(true)}
              >
                <Trash2 size={14} className="mr-1.5 inline" />
                Excluir
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmandoExclusao}
        title="Excluir mídia"
        description="Esta ação remove o registro da biblioteca de imagens. Não pode ser desfeita."
        destructive
        loading={excluir.isPending}
        onCancel={() => setConfirmandoExclusao(false)}
        onConfirm={() =>
          excluir.mutate(media.id, {
            onSuccess: () => {
              setConfirmandoExclusao(false);
              onClose();
            },
          })
        }
      />
    </>
  );
}
