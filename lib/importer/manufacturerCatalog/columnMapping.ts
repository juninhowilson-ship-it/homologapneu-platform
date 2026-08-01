/**
 * Nomes normalizados dos campos que o parser genérico de catálogo de
 * fabricante de pneu reconhece — um por conceito pedido na Auditoria
 * Técnica 1 (Marca do veículo, Modelo, Medida, Descrição, Código
 * interno, Homologado, Aplicação, Eixo, RR, Wet, Noise, Produto
 * substituto, Phase Out, Produto equivalente).
 *
 * Sem `server-only`: só tipos, precisa ser importável tanto pelo app
 * (services/repositories, sob o guard de server-only deles) quanto por
 * scripts standalone de importação executados fora do pipeline do Next —
 * mesmo motivo documentado em lib/masterData/normalizeName.ts.
 */
export type NormalizedField =
  | "vehicleBrand"
  | "vehicleModel"
  | "medida"
  | "descricao"
  | "codigoInterno"
  | "homologado"
  | "aplicacao"
  | "eixo"
  | "rr"
  | "wet"
  | "noise"
  | "produtoSubstituto"
  | "phaseOut"
  | "produtoEquivalente";

/**
 * Mapeamento de colunas de UM fabricante — chave é o NOME DA COLUNA real
 * na planilha original (comparado depois de normalizado: minúsculo, sem
 * espaços duplicados), valor é o campo normalizado correspondente. Um
 * fabricante pode omitir campos que sua planilha não tiver — o parser
 * genérico (parser.ts) nunca assume que uma coluna existe.
 *
 * O parser NUNCA depende do nome de nenhuma coluna de nenhuma marca
 * específica — toda especificidade fica aqui, como DADO (um Record),
 * nunca como lógica de parsing condicional por fabricante.
 */
export type ColumnMapping = Record<string, NormalizedField>;

export interface ManufacturerColumnConfig {
  /** Nome exatamente como cadastrado em TireManufacturer.name. */
  tireManufacturerName: string;
  mapping: ColumnMapping;
  /** true quando `mapping` já foi confirmado contra uma planilha real
   * desta marca. false = placeholder aguardando o primeiro arquivo real
   * (nunca preenchido com um nome de coluna adivinhado). */
  confirmed: boolean;
  notes?: string;
}
