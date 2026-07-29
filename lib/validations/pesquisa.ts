import * as z from "zod";
import { TIRE_CATEGORIES, TIRE_SEGMENTS } from "@/lib/constants/pneu";

export const pesquisaFiltrosSchema = z.object({
  fabricante: z.string().trim().optional(),
  modelo: z.string().trim().optional(),
  ano: z.string().trim().optional(),
  motorizacao: z.string().trim().optional(),
  medida: z.string().trim().optional(),
  homologacao: z.string().trim().optional(),
  fabricantePneu: z.string().trim().optional(),
  runFlat: z.enum(["true", "false"]).optional().or(z.literal("")),
  xl: z.enum(["true", "false"]).optional().or(z.literal("")),
  indiceCarga: z.string().trim().optional(),
  indiceVelocidade: z.string().trim().optional(),
  categoria: z.enum(TIRE_CATEGORIES).optional().or(z.literal("")),
  segmento: z.enum(TIRE_SEGMENTS).optional().or(z.literal("")),
});

export type PesquisaFiltros = z.infer<typeof pesquisaFiltrosSchema>;
