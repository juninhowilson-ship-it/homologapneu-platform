import type { ImportFileTypeValue } from "./parseFile";

export type ImportContexto = {
  fileName: string;
  userId: number | null;
  /** Override explícito do tipo de arquivo (ex.: "API" para conectores). Se
   * ausente, é inferido pela extensão de fileName. */
  fileType?: ImportFileTypeValue;
  /** Versão/identificador do catálogo/fonte oficial, quando o conector ou
   * arquivo informar (ex.: "2026.1", um ETag, um hash). */
  sourceVersion?: string;
  /** Data em que a fonte declara ter publicado/coletado os dados,
   * distinta de quando este lote foi efetivamente executado. */
  collectedAt?: Date;
};
