import "server-only";

const USER_AGENT = "HomologaPneu-DataImport/1.0 (+https://github.com/homologapneu; contato via projeto)";

type RobotsRule = { path: string; allow: boolean };
type RobotsGroup = { agents: string[]; rules: RobotsRule[] };

function parseRobotsTxt(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;

    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (key === "allow" && current) {
      current.rules.push({ path: value, allow: true });
    } else if (key === "disallow" && current) {
      if (value) current.rules.push({ path: value, allow: false });
    }
  }

  return groups;
}

function matchesGroup(group: RobotsGroup, userAgent: string): boolean {
  return group.agents.some(
    (agent) => agent === "*" || userAgent.toLowerCase().includes(agent)
  );
}

/**
 * Converte um padrao de caminho de robots.txt (que aceita `*` como
 * curinga e `$` como ancora de fim de string — extensao de facto adotada
 * por Google e outros) em uma RegExp de prefixo.
 */
function robotsPathToRegex(path: string): RegExp {
  const hasEndAnchor = path.endsWith("$");
  const raw = hasEndAnchor ? path.slice(0, -1) : path;
  const escaped = raw.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp("^" + escaped + (hasEndAnchor ? "$" : ""));
}

/**
 * Verifica, respeitando robots.txt, se um caminho pode ser coletado pelo
 * nosso agente. Aplica a convenção padrao: entre as regras aplicaveis
 * (grupo especifico do nosso User-Agent, com fallback para "*"), vence a
 * regra cujo padrao (com suporte a curinga `*` e ancora `$`) tem o
 * prefixo mais especifico (mais longo). Em caso de erro de rede ou
 * ausencia de robots.txt, assume permitido (comportamento padrao da
 * especificacao) — mas cada conector real ainda deve documentar
 * explicitamente a analise feita, nao depender apenas desta funcao.
 */
export async function isScrapingAllowed(targetUrl: string): Promise<boolean> {
  const url = new URL(targetUrl);
  const robotsUrl = `${url.origin}/robots.txt`;

  let text: string;
  try {
    const response = await fetch(robotsUrl, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) return true;
    text = await response.text();
  } catch {
    return true;
  }

  const groups = parseRobotsTxt(text);
  const specific = groups.find((g) => matchesGroup(g, USER_AGENT.split("/")[0]));
  const wildcard = groups.find((g) => g.agents.includes("*"));
  const applicable = specific ?? wildcard;
  if (!applicable) return true;

  const path = url.pathname + url.search;
  let best: RobotsRule | null = null;
  for (const rule of applicable.rules) {
    if (!rule.path) continue;
    if (robotsPathToRegex(rule.path).test(path)) {
      if (!best || rule.path.length > best.path.length) best = rule;
    }
  }

  return best ? best.allow : true;
}

const lastRequestAtByHost = new Map<string, number>();

/**
 * fetch com espacamento minimo entre requisicoes ao mesmo host, para nao
 * sobrecarregar o servidor de origem. Uso: scrapers reais (quando
 * habilitados) devem sempre passar por aqui, nunca por fetch() direto.
 */
export async function politeFetch(
  targetUrl: string,
  init: RequestInit = {},
  minDelayMs = 2000
): Promise<Response> {
  const host = new URL(targetUrl).host;
  const lastAt = lastRequestAtByHost.get(host) ?? 0;
  const wait = lastAt + minDelayMs - Date.now();
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAtByHost.set(host, Date.now());

  return fetch(targetUrl, {
    ...init,
    headers: { "User-Agent": USER_AGENT, ...init.headers },
  });
}

/** Remove tags HTML de forma simples, para extracao basica de texto. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
