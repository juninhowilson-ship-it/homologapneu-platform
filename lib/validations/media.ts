import * as z from "zod";

const MEDIA_TYPES = ["MANUFACTURER", "VEHICLE", "TIRE", "WHEEL", "DOCUMENT", "LOGO", "THUMBNAIL"] as const;
const MEDIA_STATUSES = ["PENDENTE", "PROCESSANDO", "DISPONIVEL", "DUPLICADO", "ERRO"] as const;

export const mediaListQuerySchema = z.object({
  type: z.enum(MEDIA_TYPES).optional(),
  status: z.enum(MEDIA_STATUSES).optional(),
  manufacturerId: z.coerce.number().int().positive().optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
  tireId: z.coerce.number().int().positive().optional(),
  wheelId: z.coerce.number().int().positive().optional(),
  homologationId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().optional(),
  onlyDuplicates: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

export type MediaListQueryInput = z.infer<typeof mediaListQuerySchema>;

const linkRefinement = (data: {
  manufacturerId?: number | null;
  vehicleId?: number | null;
  tireId?: number | null;
  wheelId?: number | null;
  homologationId?: number | null;
}) =>
  data.manufacturerId != null ||
  data.vehicleId != null ||
  data.tireId != null ||
  data.wheelId != null ||
  data.homologationId != null;

export const registerMediaSchema = z
  .object({
    type: z.enum(MEDIA_TYPES),
    manufacturerId: z.number().int().positive().optional(),
    vehicleId: z.number().int().positive().optional(),
    tireId: z.number().int().positive().optional(),
    wheelId: z.number().int().positive().optional(),
    homologationId: z.number().int().positive().optional(),
    title: z.string().trim().max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    source: z.string().trim().max(300).optional(),
    originalUrl: z.string().trim().url("URL de origem inválida"),
    isPrimary: z.boolean().optional(),
  })
  .refine(linkRefinement, {
    message: "Informe ao menos um vínculo (manufacturerId, vehicleId, tireId, wheelId ou homologationId)",
  });

export type RegisterMediaValues = z.infer<typeof registerMediaSchema>;

export const uploadMediaMetaSchema = z
  .object({
    type: z.enum(MEDIA_TYPES),
    manufacturerId: z.coerce.number().int().positive().optional(),
    vehicleId: z.coerce.number().int().positive().optional(),
    tireId: z.coerce.number().int().positive().optional(),
    wheelId: z.coerce.number().int().positive().optional(),
    homologationId: z.coerce.number().int().positive().optional(),
    title: z.string().trim().max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    source: z.string().trim().max(300).optional(),
    originalUrl: z.string().trim().url().optional().or(z.literal("")),
    isPrimary: z.coerce.boolean().optional(),
  })
  .refine(linkRefinement, {
    message: "Informe ao menos um vínculo (manufacturerId, vehicleId, tireId, wheelId ou homologationId)",
  });

export type UploadMediaMetaValues = z.infer<typeof uploadMediaMetaSchema>;

export const deleteMediaSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const regenerateThumbnailSchema = z.object({
  id: z.coerce.number().int().positive(),
});
