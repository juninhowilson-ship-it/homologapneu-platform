export type EpicStatus = "concluido" | "em-andamento" | "pendente";

export type Epic = {
  id: string;
  titulo: string;
  descricao: string;
  status: EpicStatus;
  data: string;
};

type BadgeTone = "neutral" | "success" | "warning" | "danger";

export const STATUS_LABEL: Record<EpicStatus, string> = {
  concluido: "Concluído",
  "em-andamento": "Em andamento",
  pendente: "Pendente",
};

export const STATUS_TONE: Record<EpicStatus, BadgeTone> = {
  concluido: "success",
  "em-andamento": "warning",
  pendente: "neutral",
};

export const STATUS_DOT: Record<EpicStatus, string> = {
  concluido: "bg-green-500",
  "em-andamento": "bg-yellow-500",
  pendente: "bg-slate-400",
};

export const EPICS: Epic[] = [
  {
    id: "fundacao",
    titulo: "Fundação & Design System",
    descricao:
      "Banco Prisma/SQLite, design tokens, AppShell e primitivos de UI (Dialog, Table, Pagination, Toast).",
    status: "concluido",
    data: "2026-07-11",
  },
  {
    id: "pesquisa",
    titulo: "Pesquisa Inteligente",
    descricao:
      "Busca de homologações com filtros de veículo, categoria, segmento e ano.",
    status: "concluido",
    data: "2026-07-11",
  },
  {
    id: "fabricantes",
    titulo: "Cadastro de Fabricantes",
    descricao: "CRUD completo de fabricantes de pneus, com upload de logotipo.",
    status: "concluido",
    data: "2026-07-11",
  },
  {
    id: "veiculos",
    titulo: "Cadastro de Veículos",
    descricao: "CRUD completo de veículos, com importação via CSV.",
    status: "concluido",
    data: "2026-07-11",
  },
  {
    id: "pneus",
    titulo: "Cadastro de Pneus",
    descricao:
      "CRUD completo de pneus, com importador genérico de CSV/Excel (mapeamento, preview e relatório).",
    status: "concluido",
    data: "2026-07-11",
  },
  {
    id: "homologacoes",
    titulo: "Cadastro de Homologações",
    descricao:
      "Relaciona veículo e pneu; backend e frontend completos (tabela, filtros, modais).",
    status: "concluido",
    data: "2026-07-12",
  },
  {
    id: "painel-dev",
    titulo: "Painel de Acompanhamento",
    descricao:
      "Páginas /dev e /roadmap com status dos EPICs, indicadores e pré-visualização das telas.",
    status: "concluido",
    data: "2026-07-12",
  },
  {
    id: "centro-tecnico",
    titulo: "Centro Técnico",
    descricao:
      "Consulta dupla (por veículo ou por pneu) com ficha técnica consolidada e imprimível.",
    status: "concluido",
    data: "2026-07-12",
  },
  {
    id: "dashboard",
    titulo: "Dashboard Executivo Premium",
    descricao:
      "KPIs reais, inteligência de mercado com gráficos Recharts, analytics de pesquisas, busca global e atalhos rápidos.",
    status: "concluido",
    data: "2026-07-12",
  },
  {
    id: "autenticacao",
    titulo: "Autenticação & Perfis de Acesso",
    descricao:
      "Login por e-mail/senha, sessão via cookie assinado, perfis Admin e Usuário com controle de acesso reforçado no Proxy.",
    status: "concluido",
    data: "2026-07-12",
  },
  {
    id: "dados-reais",
    titulo: "Dados Reais & Auditoria de Integridade",
    descricao:
      "Medidas originais de fábrica pesquisadas em fontes oficiais para os 16 veículos cadastrados, auditoria automática de integridade (medidas, compatibilidade, duplicidade, dados órfãos) e página Status do Desenvolvimento com commits e melhorias recentes.",
    status: "concluido",
    data: "2026-07-12",
  },
  {
    id: "relatorios",
    titulo: "Relatórios & Exportação",
    descricao: "Geração de relatórios de homologações em PDF/Excel.",
    status: "pendente",
    data: "2026-07-26",
  },
  {
    id: "base-oficial",
    titulo: "Base Oficial HomologaPneu — Infraestrutura de Dados",
    descricao:
      "Modelo de dados normalizado (Montadora → Modelo → Geração → Motor → Versão; Fabricante → Família → Pneu), rastreamento de validação (Necessita Validação/Validado/Rejeitado com fonte e responsável), pipeline de importação multi-formato (CSV/Excel/ODS/JSON/XML, PDF preparado) com lotes auditáveis e reversíveis, e painel administrativo de importação/auditoria/estatísticas.",
    status: "concluido",
    data: "2026-07-12",
  },
  {
    id: "postgres-producao",
    titulo: "Migração para PostgreSQL em Produção",
    descricao:
      "SQLite atende o volume atual, mas não escala com segurança para centenas de milhares de veículos e milhões de homologações em produção multiusuário. Migrar o datasource do Prisma para PostgreSQL antes do lançamento.",
    status: "pendente",
    data: "2026-08-09",
  },
  {
    id: "importador-pdf-imagens",
    titulo: "Importador de PDF & Pipeline de Imagens",
    descricao:
      "Implementar o parser de PDF (estrutura já preparada em lib/importer/parsers/pdf.ts), criar importadores dedicados para Montadoras e Homologações, e construir a API/UI de upload de fotos por veículo (principal, frontal, traseira, lateral, logotipo).",
    status: "pendente",
    data: "2026-08-23",
  },
  {
    id: "base-propria",
    titulo: "Base Própria — Múltiplas Fontes Reais",
    descricao:
      "Conectores reais e verificáveis (FIPE, Wikidata, Wikipédia, PBE Veicular do INMETRO) para montadoras, fabricantes de pneu e versões de veículo, cada um documentando sua fonte, URL, data de coleta e nível de confiança. Cobertura Nacional (métricas ao vivo) e novos indicadores no dashboard. 195 versões técnicas reais criadas para 10 montadoras (Fiat, Volkswagen, Chevrolet, Toyota, Honda, Hyundai, Jeep, Renault, Nissan, BYD).",
    status: "concluido",
    data: "2026-07-14",
  },
  {
    id: "ambiente-online",
    titulo: "Ambiente Online & Observabilidade",
    descricao:
      "Branch develop, deploy automático no Vercel a cada commit, integração com Supabase Storage, e página pública /status com saúde do banco, Supabase, contadores reais e cobertura nacional em tempo real. Deploy no Vercel e credenciais do Supabase Storage/Auth dependem de ação do usuário (login/link de conta) — ver detalhes no relatório da missão.",
    status: "em-andamento",
    data: "2026-07-14",
  },
  {
    id: "interface-v2",
    titulo: "Interface v2 — Home Pública & Painel Administrativo",
    descricao:
      "Nova Home pública (hero, pesquisa central, estatísticas reais, Como Funciona, Fontes Oficiais, últimas homologações), pesquisa inteligente com busca livre + filtros avançados, ficha pública do veículo (versões, medidas, histórico, documentos) e painel administrativo reorganizado (Dashboard, Homologações, Fabricantes, Documentos, Crawler, Curadoria, Usuários, Logs) com novo visual premium.",
    status: "concluido",
    data: "2026-07-15",
  },
];

export function calcularProgresso(epics: Epic[]): number {
  const peso: Record<EpicStatus, number> = {
    concluido: 1,
    "em-andamento": 0.5,
    pendente: 0,
  };

  const total = epics.reduce((soma, epic) => soma + peso[epic.status], 0);
  return Math.round((total / epics.length) * 100);
}

export function formatarData(data: string): string {
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}
