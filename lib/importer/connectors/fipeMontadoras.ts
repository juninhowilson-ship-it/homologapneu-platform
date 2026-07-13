import "server-only";
import type { ConnectorFetchResult, ImportConnector } from "./types";

const BASE_URL = "https://parallelum.com.br/fipe/api/v1";
const MARCAS_URL = `${BASE_URL}/carros/marcas`;
const REFERENCIAS_URL = `${BASE_URL}/referencias`;

type FipeMarca = { codigo: string; nome: string };
type FipeReferencia = { Codigo: number; Mes: string };

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

function normalizeMarcaNome(nome: string): string {
  const alias = ALIAS_MAP[nome.trim().toLowerCase()];
  return alias ?? nome.trim();
}

async function fetchJson<T>(url: string): Promise<T> {
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

/**
 * Conector para a tabela FIPE (Fundação Instituto de Pesquisas Econômicas),
 * referência oficial de identificação de veículos no Brasil, via o espelho
 * público e gratuito parallelum.com.br/fipe (sem autenticação). Traz apenas
 * a lista de montadoras (marcas) — a FIPE é uma tabela de preços, não uma
 * fonte de especificações técnicas (motor/categoria/transmissão), então não
 * é usada para gerar Veiculos/Homologacoes, o que exigiria inventar dados
 * que a fonte não fornece.
 */
export const fipeMontadorasConnector: ImportConnector = {
  id: "fipe-montadoras",
  label: "FIPE — Montadoras (carros)",
  kind: "API_PUBLICA",
  entity: "MONTADORAS",
  description:
    "Lista oficial de montadoras de veículos de passeio da tabela FIPE, via o espelho público parallelum.com.br/fipe. Não requer credenciais.",

  isConfigured(): boolean {
    return true;
  },

  async fetchRows(): Promise<ConnectorFetchResult> {
    const [marcas, referencias] = await Promise.all([
      fetchJson<FipeMarca[]>(MARCAS_URL),
      fetchJson<FipeReferencia[]>(REFERENCIAS_URL),
    ]);

    const referenciaAtual = referencias[0];
    const sourceVersion = referenciaAtual
      ? `${referenciaAtual.Codigo} - ${referenciaAtual.Mes}`
      : undefined;

    const rows = marcas.map((marca) => ({
      nome: normalizeMarcaNome(marca.nome),
      pais: "",
      site: "",
      observacoes: `Código FIPE da marca: ${marca.codigo}`,
      logo: "",
      status: "true",
    }));

    return {
      headers: ["nome", "pais", "site", "observacoes", "logo", "status"],
      rows,
      sourceVersion,
      collectedAt: new Date(),
      sourceUrl: MARCAS_URL,
    };
  },
};
