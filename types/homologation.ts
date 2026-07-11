export type Homologation = {
  id: number;
  code: string;
  vehicleId: number;
  tireId: number;
};

export type ResultadoPesquisa = {
  homologacaoId: number;
  homologacaoCodigo: string;
  homologacaoAno: number;
  veiculoFabricante: string;
  veiculoModelo: string;
  veiculoAnoInicial: number;
  veiculoAnoFinal: number;
  veiculoMotorizacao: string;
  pneuFabricante: string;
  pneuModelo: string;
  pneuMedida: string;
  pneuIndiceCarga: string;
  pneuIndiceVelocidade: string;
  pneuRunFlat: boolean;
  pneuXl: boolean;
};

export type OpcoesFiltroPesquisa = {
  fabricantes: string[];
  modelos: string[];
  anos: number[];
  motorizacoes: string[];
  medidas: string[];
  homologacoes: string[];
  fabricantesPneu: string[];
  indicesCarga: string[];
  indicesVelocidade: string[];
  categorias: string[];
  segmentos: string[];
};
