export type CoberturaMetrica = {
  total: number;
  concluidos: number;
  percentual: number;
  definicao: string;
};

export type CoberturaNacional = {
  montadoras: CoberturaMetrica;
  modelos: CoberturaMetrica;
  versoes: CoberturaMetrica;
  pneus: CoberturaMetrica;
  homologacoes: CoberturaMetrica;
  imagens: CoberturaMetrica;
  coberturaBrasil: CoberturaMetrica;
  calculadoEm: string;
};
