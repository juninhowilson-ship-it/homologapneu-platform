import type { ImportFileTypeValue } from "./parseFile";

export type ImportContexto = {
  fileName: string;
  userId: number | null;
  /** Override explícito do tipo de arquivo (ex.: "API" para conectores). Se
   * ausente, é inferido pela extensão de fileName. */
  fileType?: ImportFileTypeValue;
};
