import * as z from "zod";
import { VALIDATION_STATUSES } from "@/lib/constants/validacao";

export const montadoraFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(120, "Nome deve ter no máximo 120 caracteres"),
  legalName: z.string().trim().max(160).optional().or(z.literal("")),
  groupName: z.string().trim().max(120).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
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
  marketStartDate: z.string().trim().optional().or(z.literal("")),
  marketEndDate: z.string().trim().optional().or(z.literal("")),
  validationStatus: z.enum(VALIDATION_STATUSES),
  source: z.string().trim().max(300).optional().or(z.literal("")),
});

export type MontadoraFormValues = z.infer<typeof montadoraFormSchema>;
