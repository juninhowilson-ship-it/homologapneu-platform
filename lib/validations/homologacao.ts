import * as z from "zod";

export const homologacaoFormSchema = z.object({
  vehicleId: z.number().int().positive("Selecione o veículo"),
  tireId: z.number().int().positive("Selecione o pneu"),
  code: z
    .string()
    .trim()
    .min(1, "Código de homologação é obrigatório")
    .max(10),
  year: z.number().int().min(1950).max(2100),
  version: z.string().trim().min(1, "Versão é obrigatória").max(120),
  engine: z.string().trim().min(1, "Motor é obrigatório").max(80),
  originalSize: z
    .string()
    .trim()
    .min(1, "Medida original é obrigatória")
    .max(20),
  optionalSize: z.string().trim().max(20).optional().or(z.literal("")),
  runFlat: z.boolean(),
  xl: z.boolean(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type HomologacaoFormValues = z.infer<typeof homologacaoFormSchema>;

export const homologacaoListQuerySchema = z.object({
  q: z.string().trim().optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
  tireId: z.coerce.number().int().positive().optional(),
  code: z.string().trim().optional(),
  runFlat: z.enum(["true", "false"]).optional(),
  xl: z.enum(["true", "false"]).optional(),
  sortBy: z.enum(["code", "year", "createdAt", "updatedAt"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type HomologacaoListQuery = z.infer<typeof homologacaoListQuerySchema>;
