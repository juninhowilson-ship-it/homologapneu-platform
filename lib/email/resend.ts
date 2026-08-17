import "server-only";

/**
 * Envio de e-mail transacional via API HTTP do Resend (sem SDK — uma chamada
 * fetch simples evita mais uma dependência). O recurso é opcional: quando
 * RESEND_API_KEY não está configurada, os fluxos que dependem de e-mail devem
 * usar isEmailConfigured() e cair no caminho alternativo (canal ADMIN).
 *
 * Variáveis de ambiente:
 * - RESEND_API_KEY      (obrigatória para ativar o envio)
 * - EMAIL_FROM          (opcional; padrão onboarding@resend.dev, que só
 *                        entrega para o e-mail dono da conta Resend — em
 *                        produção configure um domínio verificado)
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "HomologaPneu <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada");
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: [options.to],
      subject: options.subject,
      html: options.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Falha ao enviar e-mail (${response.status}): ${body}`);
  }
}
