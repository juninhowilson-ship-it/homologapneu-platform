import * as z from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type LoginValues = z.infer<typeof loginSchema>;

const USER_ROLES = ["ADMIN", "USUARIO"] as const;

export const usuarioFormSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(120),
  email: z.string().trim().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  password: z
    .string()
    .min(8, "A senha deve ter ao menos 8 caracteres")
    .optional()
    .or(z.literal("")),
  role: z.enum(USER_ROLES),
  isActive: z.boolean(),
});

export type UsuarioFormValues = z.infer<typeof usuarioFormSchema>;

export const usuarioListQuerySchema = z.object({
  q: z.string().trim().optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sortBy: z.enum(["name", "email", "role", "createdAt"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type UsuarioListQuery = z.infer<typeof usuarioListQuerySchema>;
