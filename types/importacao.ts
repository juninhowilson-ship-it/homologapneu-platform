export type ImportacaoLinhaResultado = {
  linha: number;
  sucesso: boolean;
  erro?: string;
  rotulo?: string;
};

export type ImportacaoResultado = {
  total: number;
  sucesso: number;
  falhas: number;
  detalhes: ImportacaoLinhaResultado[];
};
