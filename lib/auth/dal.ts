import "server-only";
import { cache } from "react";
import { getSessionFromCookies } from "./session";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export const getCurrentUser = cache(async () => {
  const session = await getSessionFromCookies();
  if (!session) return null;

  return {
    id: session.userId,
    name: session.name,
    email: session.email,
    role: session.role,
  };
});

/**
 * Defesa em profundidade: proxy.ts já bloqueia estas rotas para não-admin,
 * mas o handler não deve depender só do matcher de prefixos continuar
 * sincronizado. Lança UnauthorizedError/ForbiddenError (tratados por
 * errorResponse) em vez de confiar apenas na proteção externa.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError("Não autenticado");
  }
  if (user.role !== "ADMIN") {
    throw new ForbiddenError("Acesso restrito a administradores");
  }
  return user;
}
