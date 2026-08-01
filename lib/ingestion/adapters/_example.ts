import "server-only";
import type { OfficialManualAdapter } from "./officialManualAdapter";

/**
 * Implementação de REFERÊNCIA — não registrada em registry.ts, não
 * conecta nenhuma fonte real, existe só para servir de modelo concreto e
 * compilável de como um adapter real seria escrito. Ver
 * docs/plataforma-ingestao.md para o passo a passo de como registrar um
 * adapter de verdade.
 *
 * `isConfigured()` sempre retorna false e `fetchRecords()` sempre
 * rejeita, pelo mesmo motivo que os stubs de
 * lib/importer/connectors/evidenceSources.ts: nunca fabricar dado
 * quando a fonte real não está conectada.
 */
export const exampleOfficialManualAdapter: OfficialManualAdapter = {
  id: "example-official-manual",
  label: "[Exemplo] Manual do Proprietário — não conectado",
  kind: "MANUAL_OFICIAL",
  manufacturerName: "Exemplo",

  isConfigured(): boolean {
    return false;
  },

  async fetchRecords() {
    throw new Error(
      "exampleOfficialManualAdapter é só uma referência de implementação — nunca deve ser registrado nem chamado. " +
        "Para um adapter real: baixe o PDF do manual (ver services/intelligentCrawler.ts para o mecanismo já em " +
        "produção), extraia a tabela de pneus/pressão via OCR/parse, e retorne um HomologationIngestionRecord por " +
        "linha real encontrada — nunca um valor inferido ou padrão."
    );
  },
};
