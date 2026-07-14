import "server-only";

export const FIPE_BASE_URL = "https://parallelum.com.br/fipe/api/v1";
export const FIPE_MARCAS_URL = `${FIPE_BASE_URL}/carros/marcas`;
export const FIPE_REFERENCIAS_URL = `${FIPE_BASE_URL}/referencias`;

export type FipeMarca = { codigo: string; nome: string };
export type FipeModelo = { codigo: number; nome: string };
export type FipeReferencia = { Codigo: number; Mes: string };

/**
 * A FIPE usa prefixos de grupo economico em alguns nomes de marca (ex.:
 * "GM - Chevrolet", "VW - VolksWagen") que nao correspondem ao nome
 * comercial usado no restante do sistema. Mapeamento explicito e restrito
 * aos casos verificados manualmente contra a base atual — nunca um regex
 * generico que poderia normalizar incorretamente uma marca legitima.
 */
const ALIAS_MAP: Record<string, string> = {
  "gm - chevrolet": "Chevrolet",
  "vw - volkswagen": "Volkswagen",
};

export function normalizeMarcaNome(nome: string): string {
  const alias = ALIAS_MAP[nome.trim().toLowerCase()];
  return alias ?? nome.trim();
}

export async function fetchFipeJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(
      `Falha ao consultar a API pública da FIPE (${url}): HTTP ${response.status}`
    );
  }
  return response.json() as Promise<T>;
}

export async function fetchFipeReferenciaAtual(): Promise<string | undefined> {
  const referencias = await fetchFipeJson<FipeReferencia[]>(FIPE_REFERENCIAS_URL);
  const atual = referencias[0];
  return atual ? `${atual.Codigo} - ${atual.Mes}` : undefined;
}

export async function fetchFipeModelos(marcaCodigo: string): Promise<FipeModelo[]> {
  const data = await fetchFipeJson<{ modelos: FipeModelo[] }>(
    `${FIPE_BASE_URL}/carros/marcas/${marcaCodigo}/modelos`
  );
  return data.modelos;
}
