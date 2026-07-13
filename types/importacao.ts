export type ImportacaoLinhaStatus = "criado" | "atualizado" | "duplicado" | "erro";

export type ImportacaoLinhaResultado = {
  linha: number;
  status: ImportacaoLinhaStatus;
  sucesso: boolean;
  erro?: string;
  rotulo?: string;
};

export type ImportacaoResultado = {
  total: number;
  sucesso: number;
  criados: number;
  atualizados: number;
  duplicados: number;
  falhas: number;
  detalhes: ImportacaoLinhaResultado[];
};
