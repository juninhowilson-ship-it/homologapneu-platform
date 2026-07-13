import "server-only";
import { prisma } from "@/lib/prisma";
import type { UsuarioListQuery } from "@/lib/validations/auth";
import type { Prisma, User } from "@prisma/client";

export type UsuarioRecord = User;

export async function listUsuarios(
  query: UsuarioListQuery
): Promise<{ data: UsuarioRecord[]; total: number }> {
  const where: Prisma.UserWhereInput = {};

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { email: { contains: query.q, mode: "insensitive" } },
    ];
  }

  if (query.role) where.role = query.role;
  if (query.status === "active") where.isActive = true;
  else if (query.status === "inactive") where.isActive = false;

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { data, total };
}

export async function findUsuarioById(id: number): Promise<UsuarioRecord | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUsuarioByEmail(
  email: string,
  excludeId?: number
): Promise<{ id: number } | null> {
  return prisma.user.findFirst({
    where: {
      email,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export async function findUsuarioForLogin(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUsuario(
  data: Prisma.UserCreateInput
): Promise<UsuarioRecord> {
  return prisma.user.create({ data });
}

export async function updateUsuario(
  id: number,
  data: Prisma.UserUpdateInput
): Promise<UsuarioRecord> {
  return prisma.user.update({ where: { id }, data });
}

export async function deleteUsuario(id: number): Promise<void> {
  await prisma.user.delete({ where: { id } });
}

export async function countAdmins(excludeId?: number): Promise<number> {
  return prisma.user.count({
    where: {
      role: "ADMIN",
      isActive: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}
