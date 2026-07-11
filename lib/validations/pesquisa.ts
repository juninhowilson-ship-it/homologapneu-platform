import * as z from "zod";

export const pesquisaFiltrosSchema = z.object({
  fabricante: z.string().trim().optional(),
  modelo: z.string().trim().optional(),
  ano: z.string().trim().optional(),
  motorizacao: z.string().trim().optional(),
  medida: z.string().trim().optional(),
  homologacao: z.string().trim().optional(),
  fabricantePneu: z.string().trim().optional(),
  runFlat: z.enum(["true", "false"]).optional(),
  xl: z.enum(["true", "false"]).optional(),
  indiceCarga: z.string().trim().optional(),
  indiceVelocidade: z.string().trim().optional(),
});

export type PesquisaFiltros = z.infer<typeof pesquisaFiltrosSchema>;
