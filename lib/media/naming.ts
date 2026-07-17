import type { MediaType } from "@prisma/client";

/**
 * Convenção de nomes do Media Manager — sempre minúsculo, separado por
 * hífen, descritivo. Exemplos do pedido original:
 *   manufacturer-logo.webp
 *   corolla-2025-front.webp
 *   primacy5-225-45-r17.webp
 */
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "225/45R17" -> "225-45-r17" */
function slugifyTireSize(size: string): string {
  return slugify(size.replace(/(\d)([A-Za-z])/g, "$1-$2"));
}

export type NamingContext = {
  type: MediaType;
  manufacturerName?: string | null;
  vehicleModelName?: string | null;
  vehicleYear?: number | string | null;
  angle?: string | null;
  tireModelName?: string | null;
  tireSize?: string | null;
  wheelLabel?: string | null;
  fallback?: string | null;
};

/** Nome de arquivo (sem extensão) a partir do contexto da entidade vinculada. */
export function buildBaseFileName(ctx: NamingContext): string {
  const parts: string[] = [];

  switch (ctx.type) {
    case "MANUFACTURER":
    case "LOGO":
      parts.push(slugify(ctx.manufacturerName || ctx.fallback || "manufacturer"));
      parts.push("logo");
      break;

    case "VEHICLE":
      parts.push(slugify(ctx.vehicleModelName || ctx.fallback || "vehicle"));
      if (ctx.vehicleYear) parts.push(slugify(String(ctx.vehicleYear)));
      if (ctx.angle) parts.push(slugify(ctx.angle));
      break;

    case "TIRE":
      parts.push(slugify(ctx.tireModelName || ctx.fallback || "tire"));
      if (ctx.tireSize) parts.push(slugifyTireSize(ctx.tireSize));
      break;

    case "WHEEL":
      parts.push(slugify(ctx.wheelLabel || ctx.fallback || "wheel"));
      break;

    case "DOCUMENT":
      parts.push(slugify(ctx.fallback || "document"));
      break;

    case "THUMBNAIL":
      parts.push(slugify(ctx.fallback || "thumb"));
      break;
  }

  return parts.filter(Boolean).join("-") || "media";
}

/** Sufixo curto e determinístico para evitar colisão sem perder legibilidade. */
export function withUniqueSuffix(baseName: string, uniqueId: string): string {
  return `${baseName}-${uniqueId.slice(0, 8)}`;
}

export function buildFileName(
  ctx: NamingContext,
  uniqueId: string,
  extension: string
): string {
  const base = withUniqueSuffix(buildBaseFileName(ctx), uniqueId);
  return `${base}.${extension.replace(/^\./, "")}`;
}
