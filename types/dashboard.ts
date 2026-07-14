export type RankingItem = {
  name: string;
  value: number;
};

export type UltimoAcesso = {
  id: number;
  resumo: string;
  resultCount: number;
  createdAt: string;
};

export type DashboardKpis = {
  fabricantes: number;
  marcas: number;
  modelos: number;
  veiculos: number;
  pneus: number;
  homologacoes: number;
  medidas: number;
  imagens: number;
  registrosImportados: number;
  coberturaBrasil: number;
  ultimaAtualizacao: string | null;
};

export type DashboardMercado = {
  homologacoesPorFabricante: RankingItem[];
  topFabricantesVeiculos: RankingItem[];
  topFabricantesPneus: RankingItem[];
  medidasMaisHomologadas: RankingItem[];
  arosMaisUtilizados: RankingItem[];
  homologacoesMaisUtilizadas: RankingItem[];
  veiculosComMaisHomologacoes: RankingItem[];
  distribuicaoCategoria: RankingItem[];
  distribuicaoSegmento: RankingItem[];
  distribuicaoCombustivel: RankingItem[];
};

export type DashboardPesquisas = {
  pesquisasMaisRealizadas: RankingItem[];
  veiculosMaisPesquisados: RankingItem[];
  pneusMaisPesquisados: RankingItem[];
  ultimosAcessos: UltimoAcesso[];
};

export type DashboardData = {
  kpis: DashboardKpis;
  mercado: DashboardMercado;
  pesquisas: DashboardPesquisas;
};
