import type { ValidationStatus } from "@/lib/constants/validacao";

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
  homologacaoAtualizadoEm: string;
  homologacaoConfiabilidade: ValidationStatus;
  homologacaoDocumentoNome: string | null;
  homologacaoDocumentoUrl: string | null;
  veiculoId: number;
  veiculoImagemUrl: string | null;
  veiculoFabricante: string;
  veiculoModelo: string;
  veiculoVersao: string;
  veiculoAnoInicial: number;
  veiculoAnoFinal: number;
  veiculoMotorizacao: string;
  pneuTipo: "ORIGINAL" | "OPCIONAL";
  pneuFabricante: string;
  pneuModelo: string;
  pneuMedida: string;
  pneuIndiceCarga: string;
  pneuIndiceVelocidade: string;
  pneuRunFlat: boolean;
  pneuXl: boolean;
  pressaoDianteira: string | null;
  pressaoTraseira: string | null;
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
