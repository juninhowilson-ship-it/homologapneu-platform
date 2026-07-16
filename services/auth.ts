import "server-only";
import { findUsuarioForLogin } from "@/repositories/usuarios";
import { verifyPassword, verifyDummyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { ValidationError } from "@/lib/errors";
import type { LoginValues } from "@/lib/validations/auth";

export async function login(input: LoginValues) {
  const user = await findUsuarioForLogin(input.email);

  if (!user || !user.isActive) {
    // Roda um bcrypt.compare "de mentira" mesmo sem usuário, para que a
    // resposta leve aproximadamente o mesmo tempo de um login com senha
    // errada — sem isso, o tempo de resposta revelaria se o e-mail existe.
    await verifyDummyPassword(input.password);
    throw new ValidationError("E-mail ou senha inválidos");
  }

  const senhaValida = await verifyPassword(input.password, user.passwordHash);
  if (!senhaValida) {
    throw new ValidationError("E-mail ou senha inválidos");
  }

  await createSession({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function logout() {
  await deleteSession();
}
