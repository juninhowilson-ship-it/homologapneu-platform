import * as z from "zod";

export const aiSuggestionStatuses = [
  "PENDENTE",
  "ALTA_CONFIANCA",
  "BAIXA_CONFIANCA",
  "CONFLITO",
  "DUPLICADO",
  "REVISADA",
  "DESCARTADA",
] as const;

export const aiSuggestionTypes = ["VEHICLE", "TIRE", "HOMOLOGATION", "DOCUMENT"] as const;

export const aiConflictStatuses = ["ABERTO", "RESOLVIDO", "IGNORADO"] as const;

export const aiSuggestionFilterSchema = z.object({
  status: z.enum(aiSuggestionStatuses).optional(),
  type: z.enum(aiSuggestionTypes).optional(),
  minConfidence: z.coerce.number().int().min(0).max(100).optional(),
  jobId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export const aiConflictFilterSchema = z.object({
  status: z.enum(aiConflictStatuses).optional(),
  jobId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export const aiReviewActionSchema = z.object({
  status: z.enum(["REVISADA", "DESCARTADA"]),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const aiConflictResolveSchema = z.object({
  status: z.enum(["RESOLVIDO", "IGNORADO"]),
});

export const aiAnalyzePreviewSchema = z.object({
  text: z.string().trim().min(1, "Informe um texto para analisar").max(50000),
});
