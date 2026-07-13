import * as z from "zod";
import { TIRE_CATEGORIES, TIRE_SEGMENTS, TIRE_TYPES } from "@/lib/constants/pneu";
import { VALIDATION_STATUSES } from "@/lib/constants/validacao";

export const pneuFormSchema = z.object({
  tireManufacturerId: z.number().int().positive("Selecione o fabricante"),
  brand: z.string().trim().min(1, "Marca é obrigatória").max(80),
  model: z.string().trim().min(1, "Modelo é obrigatório").max(120),
  family: z.string().trim().max(80).optional().or(z.literal("")),
  width: z.number().int().min(100, "Largura inválida").max(400),
  profile: z.number().int().min(20, "Perfil inválido").max(100),
  rim: z.number().int().min(10, "Aro inválido").max(24),
  loadIndex: z
    .string()
    .trim()
    .min(1, "Índice de carga é obrigatório")
    .max(10),
  speedIndex: z
    .string()
    .trim()
    .min(1, "Índice de velocidade é obrigatório")
    .max(5),
  runFlat: z.boolean(),
  xl: z.boolean(),
  seal: z.boolean(),
  tubeless: z.boolean(),
  type: z.enum(TIRE_TYPES),
  category: z.enum(TIRE_CATEGORIES),
  segment: z.enum(TIRE_SEGMENTS).optional().or(z.literal("")),
  ean: z.string().trim().max(20).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  imageUrl: z.string().trim().optional().or(z.literal("")),
  isActive: z.boolean(),
  validationStatus: z.enum(VALIDATION_STATUSES),
  source: z.string().trim().max(300).optional().or(z.literal("")),
});

export type PneuFormValues = z.infer<typeof pneuFormSchema>;

export const pneuListQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  tireManufacturerId: z.coerce.number().int().positive().optional(),
  category: z.enum(TIRE_CATEGORIES).optional(),
  segment: z.enum(TIRE_SEGMENTS).optional(),
  runFlat: z.enum(["true", "false"]).optional(),
  xl: z.enum(["true", "false"]).optional(),
  sortBy: z
    .enum(["model", "brand", "size", "createdAt", "updatedAt"])
    .default("model"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type PneuListQuery = z.infer<typeof pneuListQuerySchema>;
