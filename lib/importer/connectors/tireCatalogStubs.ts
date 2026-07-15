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
 * pedido (42 marcas verificadas). Nenhum foi habilitado nesta rodada:
 * todos os sites verificados são catálogos dinâmicos (renderizados via
 * JavaScript) sem uma API pública documentada e acessível, e vários
 * bloqueiam explicitamente coleta automatizada em robots.txt. Fabricar um
 * scraper de HTML contra um catálogo protegido por robots.txt/ToS, sem
 * uma API real por trás, arrisca violar os termos de uso dos sites e não
 * teria como extrair dados técnicos (índice de carga/velocidade,
 * medidas) que só existem dentro de widgets JS — por isso cada entrada
 * documenta o achado específico em vez de simular uma coleta. Achado
 * mais promissor até agora: General Tire (Continental) expõe no HTML o
 * endpoint real da API de catálogo e uma chave pública de serviço, mas o
 * path exato do recurso não foi determinado sem inspeção de rede via
 * navegador.
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
      "robots.txt permissivo (Allow: /), com sitemaps regionais (global/en, us/en, kr/ko, de/de), mas nenhum sitemap específico do Brasil listado — sem catálogo técnico estruturado localizável a partir daqui.",
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
    domain: "prinxchengshan.com",
    finding:
      "Domínio correto do fabricante (Prinx Chengshan) resolvido — robots.txt totalmente permissivo com sitemap.xml. Porém o sitemap é de um CMS corporativo genérico antigo (index.php?id=NNNN, sem padrão de URL por produto) — não há catálogo técnico estruturado identificável sem inspecionar manualmente cada página.",
  },
  {
    id: "triangle",
    label: "Triangle",
    domain: "triangle-group.com",
    finding:
      "robots.txt restringe a maioria dos bots (exceto Googlebot) a apenas a página inicial (Allow: /$, Disallow: /) — coleta de páginas de produto explicitamente não permitida para agentes genéricos.",
  },
  {
    id: "general-tire",
    label: "General Tire",
    domain: "generaltire.com.br",
    finding:
      "Marca da Continental. robots.txt permissivo. Achado real e específico: o HTML da home embute o endpoint da API de catálogo (data-service-url=\"https://api.productsearch.continental-tires.com/v1/generaltire\") e uma chave pública de serviço (data-service-key). A base da API responde (não é 404), mas todo path testado (/products, /search, /tyres etc.) retorna 403 \"Missing Authentication Token\" — erro padrão de rota inexistente no AWS API Gateway. O path exato do recurso não pôde ser determinado sem inspecionar as chamadas XHR reais do navegador (o widget de busca é carregado por um bundle JS separado, não referenciado estaticamente no HTML). Mais avançado que os demais — falta só confirmar o path.",
  },
  {
    id: "ceat",
    label: "CEAT",
    domain: "ceat.com",
    finding:
      "robots.txt permissivo com sitemap.xml, mas o sitemap encontrado é só de documentos de relação com investidores (PDFs financeiros), não um catálogo de produtos. Site institucional global (Índia), sem confirmação de operação/catálogo específico para o Brasil.",
  },
  {
    id: "westlake",
    label: "Westlake",
    domain: "westlaketyre.com",
    finding: "robots.txt inexistente (404) na rota testada. Requer nova verificação com a URL oficial confirmada.",
  },
  {
    id: "fate",
    label: "Fate",
    domain: "fate.com.ar",
    finding: "Domínio testado retorna 404 na raiz. Requer confirmação da URL oficial.",
  },
  {
    id: "barum",
    label: "Barum",
    domain: "barum-continental.com",
    finding: "Domínio não respondeu a partir deste ambiente. Requer confirmação da URL oficial.",
  },
  {
    id: "lanvigator",
    label: "Lanvigator",
    domain: "lanvigator.com",
    finding:
      "robots.txt permissivo (Allow: /, com sitemap.xml), mas a página inicial não expõe nenhum catálogo estruturado nem referência a API — site institucional simples.",
  },
  {
    id: "roadcruza",
    label: "Roadcruza",
    domain: "roadcruza.com",
    finding:
      "robots.txt permissivo, mas o site retorna uma página quase vazia (114 bytes) — não há catálogo publicado neste domínio no momento.",
  },
  {
    id: "roadstone",
    label: "Roadstone",
    domain: "roadstone.com.br",
    finding:
      "Domínio testado (roadstone.com.br) retorna \"Page Not Found\" — não é o domínio oficial correto. Roadstone é marca do grupo Nexen; requer confirmação da URL oficial brasileira.",
  },
  {
    id: "toyo",
    label: "Toyo",
    domain: "toyotires.com.br",
    finding: "Domínio não respondeu (timeout) a partir deste ambiente. Requer confirmação da URL oficial.",
  },
  {
    id: "cooper",
    label: "Cooper",
    domain: "coopertire.com.br",
    finding: "Domínio não respondeu (timeout) a partir deste ambiente. Requer confirmação da URL oficial.",
  },
  {
    id: "falken",
    label: "Falken",
    domain: "falkentire.com.br",
    finding: "Domínio não respondeu (timeout) a partir deste ambiente. Requer confirmação da URL oficial.",
  },
  {
    id: "maxxis",
    label: "Maxxis",
    domain: "maxxis.com.br",
    finding:
      "Domínio resolve (redireciona www->apex), mas não publica robots.txt (a rota retorna uma página \"This Page Does Not Exist\" própria do site) — site institucional (Angular) sem indício de catálogo técnico estruturado.",
  },
  {
    id: "apollo",
    label: "Apollo",
    domain: "apollotyres.com",
    finding:
      "robots.txt permissivo (só bloqueia /language-masters/*) e o sitemapindex.xml lista um sitemap pt-br real — mas essa URL (apollotyres.com/pt-br/sitemap.xml) retorna 404 na prática. Site global (AEM/Adobe), sem catálogo técnico brasileiro acessível confirmado.",
  },
  {
    id: "jktyre",
    label: "JK Tyre",
    domain: "jktyre.com",
    finding:
      "Site (Next.js) responde, mas a rota /robots.txt é capturada pelo tratamento de erro do próprio Next (\"__next_error__\") — sem robots.txt publicado nem indício de catálogo técnico acessível sem navegador real.",
  },
  {
    id: "leao",
    label: "Leão",
    domain: "leaotire.com",
    finding: "Domínio não respondeu (timeout) a partir deste ambiente. Requer confirmação da URL oficial (marca histórica brasileira, hoje sob o grupo Goodyear/outro).",
  },
  {
    id: "duraturn",
    label: "Duraturn",
    domain: "duraturn.com",
    finding:
      "robots.txt totalmente permissivo, mas o sitemap.xml só lista uma única URL de landing page — sem catálogo de produtos publicado neste domínio.",
  },
  {
    id: "double-coin",
    label: "Double Coin",
    domain: "doublecoin.com",
    finding: "Domínio responde com 404 (openresty) na raiz — sem site funcional identificável neste momento.",
  },
  {
    id: "goodride",
    label: "Goodride",
    domain: "goodridechina.com",
    finding: "Domínio não respondeu (timeout) a partir deste ambiente. Requer confirmação da URL oficial.",
  },
  {
    id: "mazzini",
    label: "Mazzini",
    domain: "mazzinitires.com",
    finding:
      "robots.txt totalmente permissivo, mas o sitemap.xml só lista uma única URL de landing page — sem catálogo de produtos publicado neste domínio (mesmo padrão da Duraturn — ambas ligadas ao grupo Prinx Chengshan).",
  },
  {
    id: "aptany",
    label: "Aptany",
    domain: "aptanytire.com",
    finding: "Domínio não respondeu (timeout) a partir deste ambiente. Requer confirmação da URL oficial.",
  },
  {
    id: "compasal",
    label: "Compasal",
    domain: "compasaltire.com",
    finding: "Domínio não respondeu (timeout) a partir deste ambiente. Requer confirmação da URL oficial.",
  },
  {
    id: "sunny",
    label: "Sunny",
    domain: "sunnytire.com",
    finding: "Domínio não respondeu (timeout) a partir deste ambiente. Requer confirmação da URL oficial.",
  },
  {
    id: "aderenza",
    label: "Aderenza",
    domain: "aderenza.com.br",
    finding:
      "Domínio resolve, mas o redirecionamento do próprio servidor está malformado (concatena o destino sem barra: \"aderenza.com.brrobots.txt\"), impedindo a leitura do robots.txt real — falha do lado do site, não uma restrição declarada.",
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
    sourceUrl: `https://${brand.domain.split(" / ")[0]}`,
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
