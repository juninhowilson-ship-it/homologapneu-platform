export type MedidaResumo = {
  medida: string;
  totalPneus: number;
  totalVeiculos: number;
  totalHomologacoes: number;
};

export type HomologacaoConfirmada = {
  homologacaoId: number;
  codigo: string;
  ano: number;
  status: string;
  papel: "ORIGINAL" | "OPCIONAL";
  fonte: string | null;
  validadoPor: string | null;
  validadoEm: string | null;
};

export type VeiculoCompativel = {
  vehicleVersionId: number;
  fabricante: string;
  modelo: string;
  versao: string;
  anoInicial: number;
  anoFinal: number;
  motor: string;
  combustivel: string;
  transmissao: string | null;
  tracao: string | null;
  categoria: string;
  homologacoesConfirmadas: HomologacaoConfirmada[];
};

export type ModeloPneuNaMedida = {
  tireId: number;
  modelo: string;
  ean: string | null;
  indiceCarga: string;
  indiceVelocidade: string;
  runFlat: boolean;
  xl: boolean;
  veiculosCompativeis: VeiculoCompativel[];
};

export type FabricantePneuNaMedida = {
  fabricanteId: number;
  fabricante: string;
  modelos: ModeloPneuNaMedida[];
};

export type AplicacaoCandidata = {
  applicationId: number;
  tireManufacturerName: string;
  tireModel: string;
  vehicleManufacturerName: string;
  vehicleModel: string;
  vehicleVersion: string;
  yearStart: number;
  yearEnd: number;
  status: string;
  confidence: number;
  evidenceCount: number;
};

export type BuscaPorMedida = {
  medida: string;
  fabricantesPneus: FabricantePneuNaMedida[];
  aplicacoesCandidatas: AplicacaoCandidata[];
  totalPneus: number;
  totalVeiculos: number;
  totalHomologacoesConfirmadas: number;
};
