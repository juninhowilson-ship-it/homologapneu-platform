import "server-only";
import type { ConnectorFetchResult, ConnectorKind, ImportConnector } from "./types";

type TireBrandFinding = {
  id: string;
  label: string;
  domain: string;
  /** Resumo objetivo do que foi verificado (robots.txt e/ou disponibilidade
   * de dados estruturados) antes de decidir NAO habilitar o scraper. */
  finding: string;
};

/**
 * Um conector independente por marca de pneu vendida no Brasil, conforme
 * pedido. Nenhum foi habilitado nesta rodada: todos os sites verificados
 * são catálogos dinâmicos (renderizados via JavaScript) sem uma API
 * pública documentada, e vários bloqueiam explicitamente coleta
 * automatizada em robots.txt. Fabricar um scraper de HTML contra um
 * catálogo protegido por robots.txt/ToS, sem uma API real por trás,
 * arrisca violar os termos de uso dos sites e não teria como extrair
 * dados técnicos (índice de carga/velocidade, medidas) que só existem
 * dentro de widgets JS — por isso cada entrada documenta o achado
 * específico em vez de simular uma coleta.
 *
 * Para habilitar uma marca: defina a variável de ambiente
 * `TIRE_CATALOG_<ID>_API_URL` apontando para uma API real (oficial ou
 * autorizada) e implemente fetchRows() consultando-a, mapeando cada linha
 * para os campos aceitos por importPneus em services/pneus.ts (fabricante,
 * marca, modelo, familia, largura, perfil, aro, indiceCarga,
 * indiceVelocidade, runFlat, xl, seal, tubeless, categoria, segmento, ean,
 * descricao, status, tecnologias).
 */
const BRAND_FINDINGS: TireBrandFinding[] = [
  {
    id: "michelin",
    label: "Michelin",
    domain: "michelin.com.br",
    finding:
      "robots.txt bloqueia explicitamente um conjunto de bots (Disallow: /); catálogo técnico não exposto por API pública.",
  },
  {
    id: "pirelli",
    label: "Pirelli",
    domain: "pirelli.com",
    finding:
      "robots.txt permite crawling geral, mas bloqueia especificamente as rotas de busca/filtro do catálogo (?search=, ?brandName= etc.) — exatamente o que um coletor precisaria.",
  },
  {
    id: "continental",
    label: "Continental",
    domain: "continental.com.br / continental-pneus.com.br",
    finding:
      "Domínio oficial brasileiro não confirmado a partir deste ambiente (falha de conexão nas variações testadas). Requer confirmação da URL correta antes de qualquer implementação.",
  },
  {
    id: "bridgestone",
    label: "Bridgestone",
    domain: "bridgestone.com.br",
    finding:
      "Sem robots.txt publicado (nenhuma restrição declarada), porém catálogo é renderizado dinamicamente sem API pública identificada.",
  },
  {
    id: "goodyear",
    label: "Goodyear",
    domain: "goodyear.com.br",
    finding:
      "Sem robots.txt publicado; site em ASP.NET com catálogo dinâmico, sem API pública identificada.",
  },
  {
    id: "yokohama",
    label: "Yokohama",
    domain: "yokohama.com.br",
    finding:
      "Sem robots.txt publicado; site é uma SPA (Nuxt.js) — dados do catálogo carregados via chamadas internas não documentadas.",
  },
  {
    id: "hankook",
    label: "Hankook",
    domain: "hankooktire.com",
    finding:
      "Domínio/rota de robots.txt não resolvida a partir deste ambiente. Requer confirmação da URL correta.",
  },
  {
    id: "kumho",
    label: "Kumho",
    domain: "kumhotire.com",
    finding:
      "robots.txt permissivo (Allow: /), mas nenhuma API pública de catálogo técnico identificada — apenas permissão de crawling geral.",
  },
  {
    id: "nexen",
    label: "Nexen",
    domain: "nexentireusa.com",
    finding:
      "robots.txt permissivo, mas é o site regional dos EUA (não o catálogo brasileiro) e sem API pública identificada.",
  },
  {
    id: "giti",
    label: "Giti",
    domain: "giti.com",
    finding:
      "robots.txt permissivo, mas sem API pública de catálogo técnico identificada.",
  },
  {
    id: "dunlop",
    label: "Dunlop",
    domain: "dunlop.eu / dunlop.com.br",
    finding:
      "Domínio oficial brasileiro não confirmado a partir deste ambiente. Requer confirmação da URL correta.",
  },
  {
    id: "bfgoodrich",
    label: "BFGoodrich",
    domain: "bfgoodrich.com",
    finding:
      "robots.txt não retornado (redirecionamento); site com proteção anti-bot ativa (gdprAppliesGlobally/iframe guard), sem API pública identificada.",
  },
  {
    id: "firestone",
    label: "Firestone",
    domain: "firestone.com",
    finding:
      "robots.txt inexistente (404) na rota testada; catálogo brasileiro está sob o domínio da Bridgestone (mesma fabricante) — ver achado de \"bridgestone\".",
  },
  {
    id: "delinte",
    label: "Delinte",
    domain: "delinte.com",
    finding:
      "robots.txt inexistente (404) na rota testada. Requer nova verificação com a URL oficial confirmada.",
  },
  {
    id: "linglong",
    label: "LingLong",
    domain: "linglongtire.com",
    finding:
      "robots.txt permissivo (Disallow vazio), mas sem API pública de catálogo técnico identificada — apenas site institucional/dinâmico.",
  },
  {
    id: "sailun",
    label: "Sailun",
    domain: "sailun.com / sailuntires.com",
    finding:
      "Domínio oficial não confirmado a partir deste ambiente. Requer confirmação da URL correta.",
  },
  {
    id: "xbri",
    label: "Xbri",
    domain: "xbri.com.br",
    finding:
      "Domínio não resolvido a partir deste ambiente. Requer confirmação da URL correta.",
  },
  {
    id: "prinx",
    label: "Prinx",
    domain: "prinxtire.com",
    finding:
      "robots.txt inexistente (404) na rota testada. Requer nova verificação com a URL oficial confirmada.",
  },
  {
    id: "triangle",
    label: "Triangle",
    domain: "triangle-group.com",
    finding:
      "robots.txt restringe a maioria dos bots (exceto Googlebot) a apenas a página inicial (Allow: /$, Disallow: /) — coleta de páginas de produto explicitamente não permitida para agentes genéricos.",
  },
];

function envVarFor(id: string): string {
  return `TIRE_CATALOG_${id.toUpperCase()}_API_URL`;
}

function createTireBrandConnector(brand: TireBrandFinding): ImportConnector {
  const kind: ConnectorKind = "CATALOGO_FABRICANTE_PNEU";
  const envVar = envVarFor(brand.id);

  return {
    id: `catalogo-pneu-${brand.id}`,
    label: `Catálogo Oficial — ${brand.label} (a configurar)`,
    kind,
    entity: "PNEUS",
    description: `${brand.domain}: ${brand.finding} Defina ${envVar} quando uma API real e autorizada for identificada.`,

    isConfigured(): boolean {
      return Boolean(process.env[envVar]);
    },

    async fetchRows(): Promise<ConnectorFetchResult> {
      throw new Error(
        `Catálogo da ${brand.label} ainda não configurado. ${brand.finding} Defina ${envVar} quando uma fonte real for identificada.`
      );
    },
  };
}

export const TIRE_BRAND_CONNECTORS: ImportConnector[] = BRAND_FINDINGS.map(
  createTireBrandConnector
);
