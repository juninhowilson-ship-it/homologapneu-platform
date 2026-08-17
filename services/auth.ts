import "server-only";
import { createHash, randomBytes } from "node:crypto";
import {
  findUsuarioForLogin,
  findUsuarioById,
  updateUsuario,
} from "@/repositories/usuarios";
import {
  createResetRequest,
  findValidResetByTokenHash,
  concluirResetsPendentes,
  countResetsRecentes,
} from "@/repositories/passwordResets";
import { isEmailConfigured, sendEmail } from "@/lib/email/resend";
import {
  verifyPassword,
  verifyDummyPassword,
  hashPassword,
} from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { ValidationError, UnauthorizedError } from "@/lib/errors";
import type { LoginValues, AlterarSenhaValues } from "@/lib/validations/auth";

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

export async function alterarSenha(
  userId: number,
  input: Pick<AlterarSenhaValues, "senhaAtual" | "novaSenha">
) {
  const user = await findUsuarioById(userId);

  if (!user || !user.isActive) {
    throw new UnauthorizedError("Não autenticado");
  }

  const senhaValida = await verifyPassword(input.senhaAtual, user.passwordHash);
  if (!senhaValida) {
    throw new ValidationError("Senha atual incorreta");
  }

  await updateUsuario(user.id, {
    passwordHash: await hashPassword(input.novaSenha),
  });
}

const RESET_EMAIL_TTL_MS = 60 * 60 * 1000; // link por e-mail vale 1 hora
const RESET_ADMIN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // aviso ao admin vale 7 dias
const MAX_RESETS_POR_HORA = 3;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Inicia a recuperação de senha. Nunca lança erro por e-mail inexistente e não
 * retorna nada que diferencie os casos — a rota responde sempre a mesma
 * mensagem genérica (anti-enumeração de contas), então qualquer distinção
 * criada aqui vazaria pelo tempo de resposta, não pelo corpo.
 *
 * Canais: com RESEND_API_KEY configurada envia link com token por e-mail; sem
 * ela (ou se o envio falhar), registra uma solicitação que o administrador vê
 * na tela de Usuários e resolve definindo uma senha nova.
 */
export async function solicitarRecuperacaoSenha(email: string, baseUrl: string) {
  const user = await findUsuarioForLogin(email);
  if (!user || !user.isActive) return;

  // Anti-flood por conta (além do rate limit por IP na rota)
  if ((await countResetsRecentes(user.id)) >= MAX_RESETS_POR_HORA) return;

  if (isEmailConfigured()) {
    const token = randomBytes(32).toString("base64url");

    await createResetRequest({
      userId: user.id,
      channel: "EMAIL",
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_EMAIL_TTL_MS),
    });

    const link = `${baseUrl}/redefinir-senha?token=${token}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "HomologaPneu — Redefinição de senha",
        html: [
          `<p>Olá, ${user.name}.</p>`,
          "<p>Recebemos uma solicitação para redefinir a senha da sua conta no HomologaPneu.</p>",
          `<p><a href="${link}">Clique aqui para criar uma nova senha</a> (o link vale por 1 hora).</p>`,
          "<p>Se você não fez esta solicitação, ignore este e-mail — sua senha continua a mesma.</p>",
        ].join("\n"),
      });
      return;
    } catch (error) {
      // Envio falhou: não silencia a solicitação — cai para o canal ADMIN,
      // que aparece na tela de Usuários. A pendência EMAIL criada acima também
      // conta para o aviso ao admin e expira sozinha em 1 hora.
      console.error("Falha ao enviar e-mail de recuperação:", error);
    }
  }

  await createResetRequest({
    userId: user.id,
    channel: "ADMIN",
    expiresAt: new Date(Date.now() + RESET_ADMIN_TTL_MS),
  });
}

export async function redefinirSenhaComToken(token: string, novaSenha: string) {
  const reset = await findValidResetByTokenHash(hashToken(token));

  if (!reset || !reset.user.isActive) {
    throw new ValidationError(
      "Link inválido ou expirado. Solicite uma nova recuperação de senha."
    );
  }

  await updateUsuario(reset.userId, {
    passwordHash: await hashPassword(novaSenha),
  });
  await concluirResetsPendentes(reset.userId);
}
