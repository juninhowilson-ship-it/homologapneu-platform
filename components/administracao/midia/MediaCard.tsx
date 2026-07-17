"use client";

import { ImageOff, Star } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { MEDIA_TYPE_LABELS, MEDIA_STATUS_LABELS, MEDIA_STATUS_TONE } from "./mediaLabels";
import type { MediaDTO } from "@/lib/media/types";

type Props = {
  media: MediaDTO;
  onClick: () => void;
};

export default function MediaCard({ media, onClick }: Props) {
  const preview = media.thumbnailUrl ?? media.storageUrl;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative flex aspect-square items-center justify-center bg-surface-muted">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={media.title ?? ""} className="h-full w-full object-contain" />
        ) : (
          <ImageOff className="text-muted-foreground" size={28} />
        )}

        {media.isPrimary && (
          <span className="absolute right-2 top-2 rounded-full bg-brand p-1 text-brand-foreground">
            <Star size={12} fill="currentColor" />
          </span>
        )}
      </div>

      <div className="space-y-1.5 p-3">
        <p className="truncate text-sm font-semibold text-foreground">
          {media.title ?? `Mídia #${media.id}`}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{MEDIA_TYPE_LABELS[media.type]}</Badge>
          <Badge tone={MEDIA_STATUS_TONE[media.status]}>{MEDIA_STATUS_LABELS[media.status]}</Badge>
        </div>
      </div>
    </button>
  );
}
