import "server-only";
import type { FonteCadastro } from "@/services/crawlerSourceCatalog";

/**
 * Catálogo inicial (semente) de fontes reais para o HomologaPneu
 * Intelligent Crawler — nenhuma entrada é inventada.
 *
 * O padrão de verificação NÃO é uniforme, e cada bloco declara o seu:
 * as fontes de MONTADORA passaram por busca + robots.txt + teste de acesso
 * HTTP real; o bloco final, de catálogos de FABRICANTE DE PNEU, passou só
 * por busca e entra todo como PENDENTE, com o motivo escrito lá. Mesmo espírito de `evidenceSources.ts` (FINDINGS):
 * HUB = página índice com PDFs estáticos confirmados; DIRECT = um PDF
 * específico já confirmado baixável; status BLOQUEADA = bloqueio técnico
 * real já verificado (não deve ser tentado de novo automaticamente).
 *
 * Fabricantes da lista prioritária ainda NÃO pesquisados o suficiente
 * para uma entrada aqui (sem URL própria verificada): Audi, BMW,
 * Mercedes-Benz (tentado — conexão falhou, inconclusivo), Porsche,
 * Mitsubishi, Suzuki (só achado manuais de moto, marca também vende
 * carros — não confirmado), Mini, Subaru (site institucional em
 * React/JS, hub de manuais sem nenhum link estático de PDF encontrado,
 * nenhuma URL direta real confirmada nesta rodada). Ficam de fora deste
 * seed por honestidade — o catálogo não deve sugerir uma URL que não
 * foi de fato verificada. Chery: busca confirmou que o site oficial
 * não publica PDF de manual (ver comentário no fim do arquivo).
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
  {
    // Nome canônico é "Kia Motors" na tabela Manufacturer (Prisma) — "Kia"
    // sozinho não resolve lá, mesmo com match case-insensitive.
    manufacturerName: "Kia Motors",
    category: "MANUAL_PROPRIETARIO",
    kind: "HUB",
    url: "https://www.kia.com.br/manual-do-proprietario",
    notes:
      "robots.txt bloqueia só /bin, /CertificadoRecallPdf, /js, /lib, /Views — página de manuais permitida. Página estática com 26 links diretos (hospedados em kiasite.blob.core.windows.net, Azure Blob Storage). PDF do Sportage confirmado baixável via GET (HTTP 200, 57,5MB — próximo do teto de 60MB do crawler).",
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
  {
    manufacturerName: "Lexus",
    category: "MANUAL_PROPRIETARIO",
    kind: "DIRECT",
    url: "https://www.lexus.com.br/content/dam/lexus-v2-brazil/manual/es-350/OM33C-70BRA-RP.pdf",
    notes:
      "robots.txt de lexus.com.br só bloqueia páginas 404 — permitido. PDF confirmado baixável via GET (HTTP 200, 8,7MB, CloudFront). Marca irmã da Toyota; nenhum HUB estático encontrado nesta rodada (apenas URLs individuais achadas por busca).",
  },
  {
    manufacturerName: "Lexus",
    category: "MANUAL_PROPRIETARIO",
    kind: "DIRECT",
    url: "https://www.lexus.com.br/content/dam/lexus-v2-brazil/manual/is-300/OM53B-90BRA-RP.pdf",
    notes: "Manual do Proprietário IS 300 — mesma verificação de robots.txt do domínio lexus.com.br.",
  },
  {
    manufacturerName: "JAC",
    category: "MANUAL_PROPRIETARIO",
    kind: "DIRECT",
    url: "https://www.jacmotors.com.br/wp-content/uploads/2025/12/E-JS4-MANUAL-1.pdf",
    notes:
      "robots.txt de jacmotors.com.br totalmente permissivo (bloco Yoast padrão, `Disallow:` vazio). PDF confirmado baixável via GET (HTTP 200, 6,5MB). Página https://www.jacmotors.com.br/servicos/manual redireciona (301) para uma página com 0 links PDF estáticos (catálogo por JS) — não habilitada como HUB; URLs individuais achadas por busca.",
  },
  {
    manufacturerName: "JAC",
    category: "MANUAL_PROPRIETARIO",
    kind: "DIRECT",
    url: "https://www.jacmotors.com.br/manuais/ejv7l.pdf",
    notes: "Manual do Proprietário E-JV7L — mesma verificação de robots.txt do domínio jacmotors.com.br.",
  },
  {
    manufacturerName: "GAC",
    category: "MANUAL_PROPRIETARIO",
    kind: "DIRECT",
    url: "https://br-www-resouce-cdn.gacgroup.com/static/BR/platform/language/common/202507/1751509386342-Manual_de_revis%C3%A3o_e_garantia_T58-G3.pdf",
    notes:
      "robots.txt de gacgroup.com totalmente permissivo (`Allow: /`). PDF confirmado baixável via GET (HTTP 200, 43,8MB — CDN próprio da GAC, não CloudFront/Akamai). Página https://www.gacgroup.com/pt-br/user-manual (0 links PDF estáticos, catálogo por JS) não habilitada como HUB.",
  },
  {
    manufacturerName: "Denza",
    category: "MANUAL_PROPRIETARIO",
    kind: "DIRECT",
    url: "https://www.denza.com/material/br_2025/B5_GR_25101_Site.pdf",
    notes:
      "robots.txt de denza.com totalmente permissivo (`Allow: /`). PDF confirmado baixável via GET (HTTP 200, 1,5MB) — é um Guia Rápido (B5), não o manual completo; nenhum manual completo nem HUB estático foi confirmado nesta rodada para a marca (site institucional recém-lançado no Brasil).",
  },
  {
    manufacturerName: "Land Rover",
    category: "MANUAL_PROPRIETARIO",
    kind: "DIRECT",
    url: "https://www.landrover.com.br/content/dam/lrdx/pdfs/br/Manal-Basico-de-Seguranca-no-Transito-ONSV.pdf",
    notes:
      "robots.txt de landrover.com.br permite /content/dam/ e a página de manuais; só bloqueia páginas específicas de configurador/comparação e algumas páginas de modelo antigas (Range Rover 2021). Página https://www.landrover.com.br/ownership/guides-and-manuals/index.html tem só este link estático (Manual Básico de Segurança no Trânsito, um guia genérico, não manual por modelo) — cobertura fraca confirmada, não um HUB completo.",
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
  {
    manufacturerName: "Volvo",
    category: "MANUAL_PROPRIETARIO",
    kind: "DIRECT",
    url: "https://www.volvocars.com/static/support-content/pdfs/br_pt-BR_xc60_2026_UM_8fb25544cb966f73fa6db0e36ae1935b.pdf",
    status: "BLOQUEADA",
    notes:
      "robots.txt de volvocars.com permite o caminho (só restringe alguns diretórios de UI/build e páginas específicas). Mas a URL do manual real do XC60 2026 (achada por busca) retornou 403 Forbidden direto (Akamai) — mesmo padrão de bloqueio de bot no nível do CDN visto em Honda/Ford, confirmado, não contornado.",
  },

  // ---- Catálogos de FABRICANTE DE PNEU indexados por veículo ----
  //
  // Classe de fonte diferente de tudo acima: as entradas anteriores são
  // manuais de MONTADORA, e a maioria está BLOQUEADA (Jeep, Fiat, Ford,
  // Chevrolet, Honda, Nissan, Mercedes, Peugeot, Citroën, Audi, BMW, BYD,
  // Volvo). Justamente as marcas com o maior buraco de homologação em 2026.
  // Os catálogos abaixo cobrem esses mesmos veículos por outra rota.
  //
  // ATENÇÃO AO PADRÃO DE VERIFICAÇÃO, que é MENOR que o do resto do arquivo.
  // As entradas acima passaram por busca + robots.txt + teste de acesso HTTP
  // real. Estas passaram SÓ por busca: o ambiente onde foram levantadas tem
  // egresso de rede bloqueado (o proxy devolve 403 em CONNECT para qualquer
  // host fora da allowlist), então robots.txt e acesso não puderam ser
  // testados. Por isso todas entram como PENDENTE — o crawler visita e
  // decide, que é exatamente a semântica desse status. NÃO promova nenhuma
  // para ATIVA sem uma visita real.
  //
  // `manufacturerName` aqui é o FABRICANTE DO PNEU, não a montadora — estas
  // fontes são indexadas por veículo, mas publicadas pela marca de pneu.
  {
    manufacturerName: "Michelin",
    category: "PRESSAO_PNEUS",
    kind: "HUB",
    url: "https://www.michelin.com.br/auto/fabricantes",
    status: "PENDENTE",
    notes:
      "Hub por montadora -> modelo, com páginas cujo título é literalmente 'pneus: Pressão e dimensões' (confirmadas em resultado de busca para honda/cr-v-v, ford/maverick, jeep/renegade, byd/king e porsche/macan). É a única fonte levantada que promete PRESSÃO além da medida, que é o dado que falta em pressure_specs. Não visitada: acesso HTTP bloqueado no ambiente do levantamento.",
  },
  {
    manufacturerName: "Continental",
    category: "TABELA_HOMOLOGACAO",
    kind: "HUB",
    url: "https://www.conti.com.br/about-us/why-continental/original-equipment/",
    status: "PENDENTE",
    notes:
      "Hub de equipamento original por montadora, com páginas por modelo no padrão /pneu-original-{marca}/pneu-original-{marca}-{modelo}/ (confirmadas em busca para fiat-mobi, volkswagen-polo, renault-kwid, jeep-compass e os hubs de Fiat, Chevrolet e Ford). Declara pneu que saiu de fábrica, não aplicação genérica. Não visitada: acesso HTTP bloqueado no ambiente do levantamento.",
  },
  {
    manufacturerName: "Bridgestone",
    category: "CATALOGO_PNEUS",
    kind: "HUB",
    url: "https://www.bridgestone.com.br/veiculos/",
    status: "PENDENTE",
    notes:
      "Busca por veículo (marca/modelo/ano). Provável seleção via JS, como já ocorreu com BYD e Subaru neste arquivo — o crawler deve confirmar se há listagem estática antes de investir. Alternativa vista na mesma busca: https://tires.bridgestone.com.br/pt-br/pneus/veiculos. Não visitada: acesso HTTP bloqueado no ambiente do levantamento.",
  },
];

/**
 * Fabricantes de pneu pesquisados SEM entrada aqui, pelo mesmo critério de
 * honestidade do resto do arquivo: Pirelli — a busca por um catálogo
 * indexado por veículo no site oficial devolveu só páginas de varejo,
 * blog e institucional, nenhuma URL de catálogo por modelo. Registrar um
 * palpite de URL apontaria para algo que pode não existir. (O catálogo
 * Pirelli já entra na base por outra via: a importação de 'Tabela de
 * Aplicação e Homologação' em manufacturer_catalogs.)
 *
 * Michelin Portugal (michelin.pt/auto/fabricantes) tem granularidade melhor
 * que a brasileira — a URL carrega ano + versão de motor + medida com
 * índices (.../jeep/renegade/renegade/2026/1.4-multiair-170/215---65-R-16-98H).
 * Ficou de fora de propósito: é o mercado português, cujas versões e
 * motorizações não coincidem com as brasileiras, e casar por nome de modelo
 * entre mercados reintroduziria exatamente o erro de geração/versão que
 * services/aplicacoesFabricante.ts existe para evitar.
 */

/**
 * Fabricantes pesquisados sem nenhuma fonte oficial de download de PDF
 * confirmada (nem HUB, nem DIRECT, nem bloqueio técnico específico —
 * simplesmente não há manual em PDF publicado): Chery — busca confirmou
 * explicitamente que o site oficial CAOA Chery Brasil não disponibiliza
 * PDF do manual do proprietário para download (só terceiros não
 * oficiais). Sem uma URL oficial real para registrar, nenhuma entrada é
 * criada aqui — criar uma apontaria para algo que não existe.
 */
