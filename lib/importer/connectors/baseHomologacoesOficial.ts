import "server-only";
import type { ConnectorFetchResult, ImportConnector } from "./types";

/**
 * Conector preparado para uma base oficial de homologações
 * veículo↔pneu (medida original + medidas opcionais homologadas).
 *
 * MOTIVO DE PERMANECER DESATIVADO: não foi localizada, até o momento,
 * nenhuma API pública/aberta do Denatran, Contran, Inmetro ou de
 * qualquer outro órgão brasileiro que exponha os registros de
 * homologação de medidas de pneus por versão de veículo. Esse dado é,
 * por natureza, específico e proprietário de cada montadora (consta na
 * ficha técnica/manual do veículo) — diferente de "Montadoras" (a FIPE
 * serve como identificação) ou de metadados de empresa (Wikidata serve
 * como enriquecimento), não há uma fonte pública agregadora conhecida
 * para homologações.
 *
 * Homologações NUNCA devem ser geradas automaticamente a partir de
 * inferência/suposição — isso violaria a regra "nunca criar
 * homologações artificialmente". Quando uma fonte oficial for
 * confirmada (ex.: um órgão publicar um dataset aberto, ou uma
 * montadora expor a ficha técnica via API), defina
 * HOMOLOGATION_SOURCE_API_URL e implemente fetchRows() consultando-a e
 * mapeando cada linha para os campos aceitos por importHomologacoes.
 */
export const baseHomologacoesOficialConnector: ImportConnector = {
  id: "base-homologacoes-oficial",
  label: "Base Oficial de Homologações (a configurar)",
  kind: "BASE_GOVERNAMENTAL",
  entity: "HOMOLOGACOES",
  description:
    "Conector preparado para uma base oficial de homologações veículo/pneu. Nenhuma API pública/governamental confirmada até o momento — ver comentário no código-fonte para o motivo detalhado.",

  isConfigured(): boolean {
    return Boolean(process.env.HOMOLOGATION_SOURCE_API_URL);
  },

  async fetchRows(): Promise<ConnectorFetchResult> {
    throw new Error(
      "Conector de homologações ainda não configurado: nenhuma fonte oficial pública confirmada. Defina HOMOLOGATION_SOURCE_API_URL quando uma for identificada."
    );
  },
};
