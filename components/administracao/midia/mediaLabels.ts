import type { MediaType, MediaStatus } from "@prisma/client";

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  MANUFACTURER: "Fabricante",
  VEHICLE: "Veículo",
  TIRE: "Pneu",
  WHEEL: "Roda",
  DOCUMENT: "Documento",
  LOGO: "Logo",
  THUMBNAIL: "Miniatura",
};

export const MEDIA_STATUS_LABELS: Record<MediaStatus, string> = {
  PENDENTE: "Pendente",
  PROCESSANDO: "Processando",
  DISPONIVEL: "Disponível",
  DUPLICADO: "Duplicado",
  ERRO: "Erro",
};

export const MEDIA_STATUS_TONE: Record<MediaStatus, "neutral" | "success" | "warning" | "danger"> = {
  PENDENTE: "neutral",
  PROCESSANDO: "warning",
  DISPONIVEL: "success",
  DUPLICADO: "danger",
  ERRO: "danger",
};
