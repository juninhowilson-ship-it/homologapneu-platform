import "server-only";
import {
  listUsuarios as listUsuariosRepo,
  findUsuarioById,
  findUsuarioByEmail,
  createUsuario as createUsuarioRepo,
  updateUsuario as updateUsuarioRepo,
  deleteUsuario as deleteUsuarioRepo,
  countAdmins,
  type UsuarioRecord,
} from "@/repositories/usuarios";
import { hashPassword } from "@/lib/auth/password";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import type {
  UsuarioFormValues,
  UsuarioListQuery,
} from "@/lib/validations/auth";
import type { Usuario, UsuarioListResponse } from "@/types/user";

function toDTO(record: UsuarioRecord): Usuario {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: record.role,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function listUsuarios(
  query: UsuarioListQuery
): Promise<UsuarioListResponse> {
  const { data, total } = await listUsuariosRepo(query);

  return {
    data: data.map(toDTO),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getUsuario(id: number): Promise<Usuario> {
  const record = await findUsuarioById(id);
  if (!record) {
    throw new NotFoundError("Usuário não encontrado");
  }
  return toDTO(record);
}

export async function createUsuario(
  input: UsuarioFormValues
): Promise<Usuario> {
  if (!input.password) {
    throw new ValidationError("Senha é obrigatória para novos usuários");
  }

  const existing = await findUsuarioByEmail(input.email);
  if (existing) {
    throw new ConflictError("Já existe um usuário com este e-mail");
  }

  const passwordHash = await hashPassword(input.password);

  const record = await createUsuarioRepo({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
    isActive: input.isActive,
  });

  return toDTO(record);
}

export async function updateUsuario(
  id: number,
  input: UsuarioFormValues
): Promise<Usuario> {
  const current = await findUsuarioById(id);
  if (!current) {
    throw new NotFoundError("Usuário não encontrado");
  }

  const existing = await findUsuarioByEmail(input.email, id);
  if (existing) {
    throw new ConflictError("Já existe um usuário com este e-mail");
  }

  const rebaixandoOuDesativandoAdmin =
    current.role === "ADMIN" &&
    (input.role !== "ADMIN" || !input.isActive);

  if (rebaixandoOuDesativandoAdmin) {
    const outrosAdmins = await countAdmins(id);
    if (outrosAdmins === 0) {
      throw new ConflictError(
        "Não é possível remover o único administrador ativo do sistema"
      );
    }
  }

  const record = await updateUsuarioRepo(id, {
    name: input.name,
    email: input.email,
    role: input.role,
    isActive: input.isActive,
    ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
  });

  return toDTO(record);
}

export async function deleteUsuario(id: number): Promise<void> {
  const current = await findUsuarioById(id);
  if (!current) {
    throw new NotFoundError("Usuário não encontrado");
  }

  if (current.role === "ADMIN") {
    const outrosAdmins = await countAdmins(id);
    if (outrosAdmins === 0) {
      throw new ConflictError(
        "Não é possível excluir o único administrador ativo do sistema"
      );
    }
  }

  await deleteUsuarioRepo(id);
}
