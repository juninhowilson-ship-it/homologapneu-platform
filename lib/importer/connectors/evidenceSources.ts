import "server-only";
import type { EvidenceSourceType } from "@prisma/client";
import type { EvidenciaInput } from "@/services/homologationEvidence";

/**
 * Fontes de evidência (marketplaces, fabricantes, montadoras, manuais,
 * catálogos OE) para o pipeline de coleta por evidências. Cada conector
 * retorna EvidenciaInput[] reais (nunca inferidos) para
 * registrarLoteEvidencias (services/homologationEvidence.ts) — nenhum
 * cria uma Homologation diretamente.
 *
 * Estrutura análoga a tireCatalogStubs.ts, mas para a entidade nova
 * (evidências de aplicação pneu↔veículo), que não se encaixa no
 * contrato ImportConnector padrão (baseado em linhas CSV genéricas para
 * uma única tabela) — aqui cada linha carrega DUAS entidades (pneu e
 * veículo) e nunca é gravada como fato definitivo por si só.
 */
export interface EvidenceConnector {
  id: string;
  label: string;
  domain: string;
  sourceType: EvidenceSourceType;
  /** Resumo objetivo do que foi verificado (robots.txt e/ou estrutura
   * real da página) antes de decidir não habilitar a coleta. */
  finding: string;
  isConfigured(): boolean;
  fetchEvidencias(): Promise<EvidenciaInput[]>;
}

function envVarFor(id: string): string {
  return `EVIDENCE_SOURCE_${id.toUpperCase()}_URL`;
}

type Finding = {
  id: string;
  label: string;
  domain: string;
  sourceType: EvidenceSourceType;
  finding: string;
};

const FINDINGS: Finding[] = [
  {
    id: "tireshop",
    label: "TireShop",
    domain: "tireshop.com.br",
    sourceType: "MARKETPLACE",
    finding:
      "robots.txt permite crawling geral do catálogo (produtos, sitemap.xml), mas bloqueia explicitamente `*veiculo=*` (busca por veículo), `/buscaproduto*` e `*q*` (qualquer querystring de busca) — exatamente os recursos que exporiam a aplicação pneu↔veículo. Especificações de produto isoladas (marca/modelo/medida) não constituem evidência de aplicação.",
  },
  {
    id: "campneus",
    label: "Campneus",
    domain: "campneus.com.br",
    sourceType: "MARKETPLACE",
    finding:
      "robots.txt permite páginas de produto (/p/...) e sitemap (plataforma VTEX), mas bloqueia `/api/`, `/busca*` e `/veiculos/?t=` (a busca por veículo). Página de produto real verificada (Pirelli Cinturato P1 Plus 225/40R18): contém apenas especificações do pneu, nenhuma lista de veículos compatíveis.",
  },
  {
    id: "dpaschoal",
    label: "D'Paschoal",
    domain: "dpaschoal.com.br",
    sourceType: "MARKETPLACE",
    finding:
      "robots.txt permite produtos/sitemap sem bloquear busca por veículo explicitamente. Página de produto real verificada (Goodyear Kelly Edge Sport 205/55R16): sem dado de aplicação por veículo na página, e nenhuma funcionalidade de busca-por-veículo foi localizada a partir daqui para confirmar se existe e se é permitida.",
  },
  {
    id: "pneustore",
    label: "PneuStore",
    domain: "pneustore.com.br",
    sourceType: "MARKETPLACE",
    finding:
      "Proteção anti-bot (Akamai) bloqueia inclusive a leitura do robots.txt (HTTP 403 \"Access Denied\" mesmo nessa rota) — não é possível sequer verificar a política declarada do site a partir deste ambiente, então nenhuma coleta é tentada.",
  },
  {
    id: "fiat-manual-proprietario",
    label: "Fiat — Manual do Proprietário (servicos.fiat.com.br)",
    domain: "servicos.fiat.com.br",
    sourceType: "MANUAL",
    finding:
      "Fonte mais avançada encontrada até agora: sem robots.txt publicado, e o PDF oficial do manual do proprietário É baixável de verdade com um User-Agent de navegador comum (ex.: handbook-2018-argo.pdf, 10,6MB, HTTP 200) — sem essa UA, o servidor retorna 403. Dois bloqueios reais impedem um conector automatizado hoje: (1) manuais.html não lista os PDFs em HTML estático nem em sitemap.xml — a seleção de modelo/ano resolve o código numérico do produto (ex. \"358\" para o Argo) via uma chamada JS não identificada a partir do HTML estático, então não há como enumerar todos os modelos/anos automaticamente; (2) o PDF baixado usa uma fonte com codificação não padrão — pdftotext extrai texto ilegível (mojibake), exigiria OCR para extrair as especificações técnicas de pneus reais que o manual certamente contém.",
  },
];

function stubConnector(f: Finding): EvidenceConnector {
  const envVar = envVarFor(f.id);
  return {
    id: f.id,
    label: f.label,
    domain: f.domain,
    sourceType: f.sourceType,
    finding: f.finding,
    isConfigured(): boolean {
      return Boolean(process.env[envVar]);
    },
    async fetchEvidencias(): Promise<EvidenciaInput[]> {
      throw new Error(
        `${f.label} ainda não configurado. ${f.finding} Defina ${envVar} quando uma fonte real e permitida for identificada.`
      );
    },
  };
}

export const EVIDENCE_CONNECTORS: EvidenceConnector[] = FINDINGS.map(stubConnector);

export function getEvidenceConnector(id: string): EvidenceConnector | undefined {
  return EVIDENCE_CONNECTORS.find((c) => c.id === id);
}

export function listEvidenceConnectors() {
  return EVIDENCE_CONNECTORS.map((c) => ({
    id: c.id,
    label: c.label,
    domain: c.domain,
    sourceType: c.sourceType,
    finding: c.finding,
    configured: c.isConfigured(),
  }));
}
