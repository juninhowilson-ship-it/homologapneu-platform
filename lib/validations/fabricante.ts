import * as z from "zod";
import { VALIDATION_STATUSES } from "@/lib/constants/validacao";

export const fabricanteFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(120, "Nome deve ter no máximo 120 caracteres"),
  country: z
    .string()
    .trim()
    .min(1, "País é obrigatório")
    .max(80, "País deve ter no máximo 80 caracteres"),
  website: z
    .union([z.literal(""), z.string().trim().url("URL inválida")])
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, "Observações devem ter no máximo 1000 caracteres")
    .optional()
    .or(z.literal("")),
  logoUrl: z.string().trim().optional().or(z.literal("")),
  isActive: z.boolean(),
  validationStatus: z.enum(VALIDATION_STATUSES),
  source: z.string().trim().max(300).optional().or(z.literal("")),
  confidence: z.number().int().min(0).max(100).nullable().optional(),
});

export type FabricanteFormValues = z.infer<typeof fabricanteFormSchema>;

export const fabricanteListQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  sortBy: z
    .enum(["name", "country", "createdAt", "updatedAt"])
    .default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type FabricanteListQuery = z.infer<typeof fabricanteListQuerySchema>;
