import "server-only";
import type { FonteCadastro } from "@/services/crawlerSourceCatalog";

/**
 * Catálogo inicial (semente) de fontes reais para o HomologaPneu
 * Intelligent Crawler — cada entrada é resultado de uma verificação real
 * (busca + robots.txt + teste de acesso HTTP real) feita nesta sessão,
 * nunca inventada. Mesmo espírito de `evidenceSources.ts` (FINDINGS):
 * HUB = página índice com PDFs estáticos confirmados; DIRECT = um PDF
 * específico já confirmado baixável; status BLOQUEADA = bloqueio técnico
 * real já verificado (não deve ser tentado de novo automaticamente).
 *
 * Fabricantes da lista prioritária ainda NÃO pesquisados nesta rodada
 * (sem entrada aqui, portanto 0 fontes cadastradas até agora): Audi,
 * Kia, GAC, Denza, Volvo, BMW, Mercedes-Benz (tentado — conexão falhou,
 * inconclusivo), Porsche, Land Rover, Mitsubishi, Subaru, Suzuki, Lexus,
 * Mini, Chery, JAC. Ficam de fora deste seed por honestidade — o
 * catálogo não deve sugerir uma URL que não foi de fato verificada.
 */
export const OFFICIAL_DOCUMENT_SOURCES: FonteCadastro[] = [
  // ---- ATIVA: página índice (HUB) com PDFs estáticos confirmados ----
  {
    manufacturerName: "Toyota",
    category: "MANUAL_PROPRIETARIO",
    kind: "HUB",
    url: "https://legado.toyota.com.br/manuais/",
    notes:
      "Site legado WordPress da Toyota Brasil, robots.txt totalmente permissivo (só bloqueia /wp-admin/). Página estática lista 233 links diretos para manuais do proprietário e etiquetas de segurança em PDF. Manuais completos confirmados baixáveis via GET com User-Agent de navegador (Corolla 93MB, Etios 35MB); PDFs de 'Etiqueta de Segurança' retornam 403 da CloudFront/WAF especificamente por esse padrão de nome — bloqueio real, não contornado.",
  },
  {
    manufacturerName: "Volkswagen",
    category: "MANUAL_PROPRIETARIO",
    kind: "HUB",
    url: "https://www.vw.com.br/pt/servicos-e-acessorios/servicos-e-produtos/manuais-e-garantia/manuais.html",
    notes:
      "Página estática (sem JS) com mais de 50 links diretos para manuais oficiais (MY2013-MY2027, todos os modelos atuais). robots.txt só bloqueia extensões de imagem/vídeo sob /content/dam/ — PDFs são permitidos. PDF do Polo MY26 confirmado baixável (5,5MB); conteúdo de pneus fica só numa etiqueta física (foto), não extraível como texto.",
  },
  {
    manufacturerName: "Chevrolet",
    category: "MANUAL_PROPRIETARIO",
    kind: "HUB",
    url: "https://www.chevrolet.com.br/servicos/manuais",
    notes:
      "robots.txt: grupo `User-agent: *` só tem `Allow: /` (restrições existem só para os grupos específicos GMbot/Googlebot, que não se aplicam). Página estática real com 105 links diretos para PDFs (Onix, Tracker, Montana, Spin, Spark, Equinox EV, Blazer EV etc.).",
  },
  {
    manufacturerName: "Nissan",
    category: "MANUAL_PROPRIETARIO",
    kind: "HUB",
    url: "https://www.nissan.com.br/servicos/manuais.html",
    notes:
      "robots.txt permite (só bloqueia /*_tel_*, /busca.html e afins). Página 'Manuais e Guias de Todos os Modelos' estática com 21 links diretos (CDN nissan-cdn.net, URLs protocol-relative).",
  },
  {
    manufacturerName: "Renault",
    category: "MANUAL_PROPRIETARIO",
    kind: "HUB",
    url: "https://www.renault.com.br/manuais.html",
    notes:
      "robots.txt só restringe parâmetros de query (conf/dealerId/vin) — página em si permitida. 7 links diretos estáticos confirmados (cdn.group.renault.com), incluindo guias de resgate/bombeiros além do manual do proprietário.",
  },
  {
    manufacturerName: "GWM",
    category: "MANUAL_PROPRIETARIO",
    kind: "HUB",
    url: "https://www.gwmmotors.com.br/pt/servicos/manuais",
    notes:
      "robots.txt com grupo `User-agent: *` vazio (sem Disallow). Página estática com 48 links diretos para PDFs de manuais.",
  },

  // ---- ATIVA: PDF direto individual já confirmado baixável ----
  {
    manufacturerName: "Hyundai",
    category: "MANUAL_PROPRIETARIO",
    kind: "DIRECT",
    url: "https://www.hyundai.com.br/content/dam/hmb/download-manuais/manual-hb20.pdf",
    notes:
      "robots.txt permite /content/dam/hmb/ (só bloqueia /bin/,/system/,/libs/ etc.). PDF confirmado baixável via GET (HTTP 200, 7,9MB). Página https://www.hyundai.com.br/proprietarios.html existe mas não teve estrutura de HUB estática confirmada nesta rodada — cada modelo cadastrado individualmente por ora.",
  },
  {
    manufacturerName: "Hyundai",
    category: "MANUAL_PROPRIETARIO",
    kind: "DIRECT",
    url: "https://www.hyundai.com.br/content/dam/hmb/download-manuais/A1GO-PB211A_Site.pdf",
    notes: "Manual do Proprietário Creta — mesma verificação de robots.txt do domínio hyundai.com.br.",
  },
  {
    manufacturerName: "Jeep",
    category: "MANUAL_PROPRIETARIO",
    kind: "DIRECT",
    url: "https://www.jeep.com.br/content/dam/jeep/products/handbooks/611/2020/handbook-renegade-2020.pdf",
    notes:
      "robots.txt de jeep.com.br só lista grupos de bots de IA específicos (todos Allow: /), sem grupo `User-agent: *` — nenhuma regra se aplica a um crawler genérico. PDF confirmado baixável via GET (HTTP 200). Mesmo padrão de URL (`/content/dam/<marca>/products/handbooks/`) usado pela Fiat (bloqueada) e pela RAM (também confirmada) — sugere um catálogo comum Stellantis; página índice `jeep.com.br` não teve um HUB estático confirmado nesta rodada.",
  },
  {
    manufacturerName: "RAM",
    category: "MANUAL_PROPRIETARIO",
    kind: "DIRECT",
    url: "https://www.ram.com.br/content/dam/ram/products/handbooks/rampage/2024/handbook-2024-2025-rampage.pdf",
    notes:
      "Mesmo padrão Stellantis do Jeep. robots.txt de ram.com.br só lista bots de IA específicos, sem grupo `User-agent: *`. PDF confirmado baixável via GET (HTTP 200). Página https://www.ram.com.br/manuais.html existe mas retornou 0 links PDF estáticos (catálogo resolvido via JS, como a Fiat) — não habilitada como HUB.",
  },

  // ---- BLOQUEADA: bloqueio técnico real já verificado, não contornado ----
  {
    manufacturerName: "Fiat",
    category: "MANUAL_PROPRIETARIO",
    kind: "HUB",
    url: "https://servicos.fiat.com.br/manuais.html",
    status: "BLOQUEADA",
    notes:
      "(Achado de sessão anterior, mantido aqui para consolidar o catálogo.) PDF do manual É baixável com User-Agent de navegador, mas manuais.html não lista os PDFs em HTML estático nem sitemap — a seleção de modelo/ano resolve o código do produto via chamada JS não identificada, então não há como enumerar automaticamente. Além disso o PDF usa fonte com codificação não padrão (pdftotext extrai mojibake), exigiria OCR.",
  },
  {
    manufacturerName: "Honda",
    category: "MANUAL_PROPRIETARIO",
    kind: "HUB",
    url: "https://www.honda.com.br/pos-venda/automoveis/escolha-veiculo",
    status: "BLOQUEADA",
    notes:
      "Proteção Akamai/Edgesuite bloqueia com 403 'Access Denied' inclusive a leitura do robots.txt e o download direto de PDFs já publicados (ex.: manual do City 2021, URL real encontrada por busca) — bloqueio de bot no nível do CDN, confirmado em dois pontos diferentes (robots.txt e o PDF em si), não contornado.",
  },
  {
    manufacturerName: "Ford",
    category: "MANUAL_PROPRIETARIO",
    kind: "HUB",
    url: "https://www.ford.com.br/support/owner-manuals/",
    status: "BLOQUEADA",
    notes:
      "Mesmo padrão Akamai/Edgesuite do Honda: 403 'Access Denied' tanto no robots.txt quanto no download direto de um PDF real (manual do Ka 2020, URL encontrada por busca). Bloqueio de bot confirmado, não contornado.",
  },
  {
    manufacturerName: "Peugeot",
    category: "MANUAL_PROPRIETARIO",
    kind: "HUB",
    url: "https://www.peugeot.com.br/servicos-e-manuais/manuais.html",
    status: "BLOQUEADA",
    notes:
      "robots.txt de peugeot.com.br só lista bots de IA específicos (sem grupo `*`, mesmo padrão Stellantis de Jeep/RAM — em princípio permitido). Mas a página em si retornou 0 links PDF estáticos (catálogo por JS) e uma URL de PDF real (manual 208, subdomínio carros.peugeot.com.br, achada por busca) retornou 403 Forbidden direto — bloqueio real nesse subdomínio específico, não contornado.",
  },
  {
    manufacturerName: "Citroën",
    category: "MANUAL_PROPRIETARIO",
    kind: "HUB",
    url: "https://www.citroen.com.br/meu-citroen/manuais.html",
    status: "BLOQUEADA",
    notes:
      "Mesmo padrão Stellantis de Peugeot: robots.txt sem grupo `*` (em princípio permitido), mas página com 0 links PDF estáticos — catálogo de modelo/ano resolvido via JS, sem uma forma estática de enumerar automaticamente.",
  },
  {
    manufacturerName: "BYD",
    category: "MANUAL_PROPRIETARIO",
    kind: "HUB",
    url: "https://www.byd.com/br/manual-proprietario",
    status: "BLOQUEADA",
    notes:
      "robots.txt vazio (sem restrição declarada). Página em si retornou 0 links PDF estáticos (seleção de modelo via JS). URLs de PDF individuais encontradas por busca externa (ex. Dolphin) retornaram 404 — links desatualizados, não uma fonte estática confiável para enumeração automática.",
  },
];
