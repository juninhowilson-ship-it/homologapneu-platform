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
    id: "relatorios",
    titulo: "Relatórios & Exportação",
    descricao: "Geração de relatórios de homologações em PDF/Excel.",
    status: "pendente",
    data: "2026-07-26",
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
