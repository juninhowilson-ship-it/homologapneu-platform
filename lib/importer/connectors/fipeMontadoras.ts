import "server-only";
import {
  FIPE_MARCAS_URL,
  fetchFipeJson,
  fetchFipeReferenciaAtual,
  normalizeMarcaNome,
  type FipeMarca,
} from "./fipeClient";
import type { ConnectorFetchResult, ImportConnector } from "./types";

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
  sourceUrl: FIPE_MARCAS_URL,
  label: "FIPE — Montadoras (carros)",
  kind: "API_PUBLICA",
  entity: "MONTADORAS",
  description:
    "Lista oficial de montadoras de veículos de passeio da tabela FIPE, via o espelho público parallelum.com.br/fipe. Não requer credenciais.",

  isConfigured(): boolean {
    return true;
  },

  async fetchRows(): Promise<ConnectorFetchResult> {
    const [marcas, sourceVersion] = await Promise.all([
      fetchFipeJson<FipeMarca[]>(FIPE_MARCAS_URL),
      fetchFipeReferenciaAtual(),
    ]);

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
      sourceUrl: FIPE_MARCAS_URL,
    };
  },
};
