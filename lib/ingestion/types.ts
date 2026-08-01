import "server-only";

/**
 * Tipo de fonte que produziu um HomologationIngestionRecord — usado para
 * organização/exibição e para traduzir o registro para o EvidenceSourceType
 * já existente quando ele for encaminhado ao Motor de Validação
 * (services/homologationEvidence.ts) — ver toEvidenciaInput.ts e
 * docs/plataforma-ingestao.md.
 */
export type IngestionSourceKind =
  | "MANUAL_OFICIAL"
  | "FABRICANTE_PNEU"
  | "CATALOGO_REVENDA"
  | "CATALOGO_TECNICO"
  | "REVISAO_HUMANA";

/**
 * Formato comum que TODO adapter de ingestão deve produzir, independente
 * da origem real (manual oficial, fabricante de pneu, revenda, catálogo
 * técnico, ou revisão humana) — ver HomologationSourceAdapter (adapter.ts).
 *
 * Nenhum campo além de `fabricante`/`modelo`/`documentoOrigem`/
 * `nivelConfianca`/`dataCaptura` é obrigatório: cada adapter só preenche o
 * que a fonte real declarou, nunca inventa nem infere um valor ausente —
 * mesma regra já aplicada em todo o pipeline existente
 * (HomologationCandidate, HomologationEvidence). `null` sempre significa
 * "esta fonte não informou este campo", nunca "zero"/"nenhum".
 */
export interface HomologationIngestionRecord {
  fabricante: string;
  modelo: string;
  versao: string | null;
  anoInicial: number | null;
  anoFinal: number | null;
  medida: string | null;
  indiceCarga: string | null;
  indiceVelocidade: string | null;
  /** Texto livre, unidade original da fonte (bar/psi/kPa) — nunca
   * convertida, mesma convenção de VehiclePressureSpec. */
  pressaoDianteira: string | null;
  pressaoTraseira: string | null;
  /** Especificação de roda em texto livre (ex.: "6.5J x 16"), quando a
   * fonte declarar separadamente da medida do pneu. */
  roda: string | null;
  /** Código OE (Original Equipment) declarado pela fonte, quando existir
   * — ver model OeCode no schema. */
  oe: string | null;
  marcaPneu: string | null;
  modeloPneu: string | null;
  /** URL ou identificador do documento de origem — sempre obrigatório
   * para rastreabilidade (nenhum registro sem proveniência). */
  documentoOrigem: string;
  pagina: number | null;
  /** 0-100, atribuída pelo próprio adapter com base no que a fonte
   * realmente permite verificar — nunca uma estimativa genérica. */
  nivelConfianca: number;
  dataCaptura: Date;
}
