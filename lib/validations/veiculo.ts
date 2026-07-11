import * as z from "zod";
import {
  FUEL_TYPES,
  VEHICLE_CATEGORIES,
  VEHICLE_SEGMENTS,
} from "@/lib/constants/veiculo";

export const veiculoFormSchema = z
  .object({
    manufacturerId: z.number().int().positive("Selecione a marca"),
    model: z.string().trim().min(1, "Modelo é obrigatório").max(120),
    version: z.string().trim().min(1, "Versão é obrigatória").max(120),
    yearStart: z.number().int().min(1950).max(2100),
    yearEnd: z.number().int().min(1950).max(2100),
    engine: z.string().trim().min(1, "Motorização é obrigatória").max(80),
    power: z.string().trim().max(40).optional().or(z.literal("")),
    fuel: z.enum(FUEL_TYPES),
    category: z.enum(VEHICLE_CATEGORIES),
    segment: z.enum(VEHICLE_SEGMENTS).optional().or(z.literal("")),
    country: z.string().trim().max(80).optional().or(z.literal("")),
    imageUrl: z.string().trim().optional().or(z.literal("")),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    isActive: z.boolean(),
  })
  .refine((data) => data.yearEnd >= data.yearStart, {
    message: "Ano final deve ser maior ou igual ao ano inicial",
    path: ["yearEnd"],
  });

export type VeiculoFormValues = z.infer<typeof veiculoFormSchema>;

export const veiculoListQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  manufacturerId: z.coerce.number().int().positive().optional(),
  fuel: z.enum(FUEL_TYPES).optional(),
  category: z.enum(VEHICLE_CATEGORIES).optional(),
  segment: z.enum(VEHICLE_SEGMENTS).optional(),
  sortBy: z
    .enum(["model", "version", "yearStart", "createdAt", "updatedAt"])
    .default("model"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type VeiculoListQuery = z.infer<typeof veiculoListQuerySchema>;
