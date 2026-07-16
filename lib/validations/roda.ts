import * as z from "zod";
import { VALIDATION_STATUSES } from "@/lib/constants/validacao";

export const rodaFormSchema = z.object({
  width: z.number().min(3, "Largura inválida").max(20),
  diameter: z.number().int().min(10, "Diâmetro inválido").max(24),
  offset: z.number().int().min(-100).max(150).nullable().optional(),
  boltPattern: z.string().trim().min(1, "Furação é obrigatória").max(20),
  hubBore: z.number().min(30).max(120).nullable().optional(),
  validationStatus: z.enum(VALIDATION_STATUSES),
  source: z.string().trim().max(300).optional().or(z.literal("")),
});

export type RodaFormValues = z.infer<typeof rodaFormSchema>;

export const rodaListQuerySchema = z.object({
  q: z.string().trim().optional(),
  diameter: z.coerce.number().int().positive().optional(),
  boltPattern: z.string().trim().optional(),
  sortBy: z.enum(["diameter", "width", "createdAt", "updatedAt"]).default("diameter"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type RodaListQuery = z.infer<typeof rodaListQuerySchema>;
