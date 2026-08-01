import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  isStorageConfigured,
  ensureLogoBucketsExist,
  uploadImageFromUrl,
  BUCKET_LOGOS,
} from "../lib/storage/supabaseStorage";

/**
 * A consulta Wikidata (enrich-logos.ts) trava com HTTP 504 pra fabricante
 * de pneu: sem uma classe confiável e universal, o filtro fica pesado
 * demais pro endpoint público aguentar ~260 nomes, muitos genéricos
 * (Titan, Royal, Drive...). Alternativa: API de miniaturas da Wikipédia
 * (mesmo truque de bypass do rate-limit usado em
 * fetch-vehicle-photos-wikipedia-api.ts) — a foto de infobox de uma
 * página de empresa quase sempre É o logo, então dá pra reusar
 * "prop=pageimages" em vez de SPARQL.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const THUMB_SIZE = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ImagemEncontrada = { url: string; tituloResolvido: string; nomeArquivo: string; descricao: string | null };

async function buscarImagemWikipedia(titulo: string): Promise<ImagemEncontrada | null> {
  const params = new URLSearchParams({
    action: "query",
    titles: titulo,
    prop: "pageimages|description",
    format: "json",
    pithumbsize: String(THUMB_SIZE),
    redirects: "1",
  });
  const resp = await fetch(`https://en.wikipedia.org/w/api.php?${params.toString()}`, {
    headers: { "User-Agent": "HomologaPneu/1.0 (contato via painel administrativo)" },
  });
  if (!resp.ok) return null;
  const texto = await resp.text();
  // O limite de taxa da API às vezes devolve HTTP 200 com um corpo de
  // texto simples ("You are making too many requests...") em vez de JSON
  // — sem checar isso, um `.json()` direto falharia silenciosamente ou
  // faria o lote inteiro parecer "sem resultado" quando na verdade só
  // estava sendo limitado.
  if (!texto.trim().startsWith("{")) {
    throw new Error(`Resposta não-JSON da API (provável rate limit): ${texto.slice(0, 80)}`);
  }
  const data = JSON.parse(texto);
  if (data?.error) {
    // MediaWiki também devolve erro (rate limit, etc.) como JSON válido
    // com uma chave "error" em vez de "query" — sem checar isso, isso
    // silenciosamente vira "não encontrado" igual a uma página inexistente.
    throw new Error(`Erro da API: ${JSON.stringify(data.error).slice(0, 150)}`);
  }
  const pages = data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0] as
    | { title?: string; thumbnail?: { source?: string }; pageimage?: string; description?: string; missing?: string }
    | undefined;
  if (!page || page.missing !== undefined || !page.thumbnail?.source || !page.pageimage) return null;
  return {
    url: page.thumbnail.source,
    tituloResolvido: page.title ?? titulo,
    nomeArquivo: page.pageimage,
    descricao: page.description ?? null,
  };
}

// Marcas com capitalização interna que "Title Case" ingênuo não acerta
// (mesmo problema resolvido em fetch-vehicle-photos-wikipedia-api.ts).
const EXCECOES_CAPITALIZACAO: Record<string, string> = {
  mclaren: "McLaren",
  ssangyong: "SsangYong",
  deloreans: "DeLorean",
};

function paraTitleCase(nome: string): string {
  return nome
    .toLowerCase()
    .split(/\s+/)
    .map((palavra) => EXCECOES_CAPITALIZACAO[palavra] ?? (palavra.length > 0 ? palavra[0].toUpperCase() + palavra.slice(1) : palavra))
    .join(" ");
}

function nomeParaWikipedia(nome: string): string {
  // Siglas curtas (RAM, JAC, GAC...) continuam maiúsculas — só normaliza
  // o "GRITANDO EM CAPS" de nomes que são palavras normais (ex.:
  // "MERCEDES" -> "Mercedes", "ASTON MARTIN" -> "Aston Martin").
  const éSigla = nome === nome.toUpperCase() && nome.replace(/[^A-Z]/g, "").length <= 4;
  return éSigla ? nome : paraTitleCase(nome);
}

function pareceLogoValido(nomeArquivo: string): boolean {
  const nome = nomeArquivo.toLowerCase();
  const ehSvgOuPng = /\.(svg|png)$/.test(nome);
  const contemPalavraLogo = /logo|emblem|badge|wordmark/.test(nome);
  return ehSvgOuPng || contemPalavraLogo;
}

/**
 * Descoberta que resolve o problema de colisão de nome genérico (ex.:
 * "ASIA" -> continente Ásia, "Horizon" -> conceito de horizonte, "NHS"
 * -> serviço de saúde do Reino Unido — todos com arquivo que por acaso
 * parecia logo): a API devolve `description`, um resuminho de uma linha
 * derivado do Wikidata (ex.: "French automotive brand founded in 1810"
 * pra Peugeot, vs. "Continent" pra Asia). Exigir que essa descrição
 * mencione o domínio certo (carro/pneu/empresa) filtra a entidade errada
 * mesmo quando o arquivo de imagem passaria no teste de "parece logo".
 */
function descricaoPareceRelevante(descricao: string | null, dominio: "veiculo" | "pneu"): boolean {
  if (!descricao) return false;
  const d = descricao.toLowerCase();
  const termosEmpresa = /company|manufacturer|brand|corporation|conglomerate|subsidiary|automaker|marque/;
  const termosDominio = dominio === "veiculo"
    ? /automotive|automobile|car|vehicle|motor|truck|motorcycle/
    : /tire|tyre|rubber/;
  return termosEmpresa.test(d) && termosDominio.test(d);
}

async function enriquecer<T extends { id: number; name: string }>(
  label: string,
  itens: T[],
  atualizar: (id: number, logoUrl: string) => Promise<unknown>,
  bucketPrefixo: string,
  ehFabricantePneu: boolean
) {
  let encontrados = 0;
  let hospedados = 0;
  let processados = 0;
  const semMatch: string[] = [];

  for (const item of itens) {
    processados++;
    // Nomes de 1-2 letras têm risco alto demais de bater com entidade
    // errada da Wikipédia (mesmo problema já visto com veículos). Nomes
    // com "/" agrupam duas empresas numa linha só (dado legado) — não dá
    // pra atribuir um logo único com segurança.
    if (item.name.replace(/[^a-zA-Z0-9]/g, "").length < 3 || item.name.includes("/")) {
      semMatch.push(`${item.name} (nome curto demais ou composto)`);
      continue;
    }

    const nomeWiki = nomeParaWikipedia(item.name);
    // Nome puro primeiro (funciona pra maioria: Peugeot, Acura, Engesa...)
    // e a forma desambiguada como reforço — a defesa real contra colisão
    // de nome genérico agora é `descricaoPareceRelevante`, não a ordem
    // dos candidatos.
    const candidatos = ehFabricantePneu
      ? [nomeWiki, `${nomeWiki} (tire manufacturer)`, `${nomeWiki} (tyre manufacturer)`, `${nomeWiki} (brand)`]
      : [nomeWiki, `${nomeWiki} (automobile manufacturer)`, `${nomeWiki} (car manufacturer)`, `${nomeWiki} (motor company)`];
    const dominio = ehFabricantePneu ? "pneu" : "veiculo";
    let achado: ImagemEncontrada | null = null;
    for (const candidato of candidatos) {
      // A API está com limite de taxa intermitente/instável nesta sessão
      // (sucesso e bloqueio alternam sem padrão previsível). Em vez de
      // insistir muito numa mesma passada (o que deixaria o script MUITO
      // lento no pior caso), tenta 1x e segue — quem já foi salvo fica
      // fora do pool na próxima passada, então rodar o script de novo
      // depois é mais barato que esperar dentro da mesma execução.
      let resultado: ImagemEncontrada | null = null;
      try {
        resultado = await buscarImagemWikipedia(candidato);
      } catch (erro) {
        console.log(`Pulando "${candidato}": ${erro instanceof Error ? erro.message : erro}`);
      }
      await sleep(1000);
      if (resultado && pareceLogoValido(resultado.nomeArquivo) && descricaoPareceRelevante(resultado.descricao, dominio)) {
        achado = resultado;
        break;
      }
    }

    if (!achado) {
      semMatch.push(item.name);
      if (processados % 25 === 0) console.log(`... ${processados}/${itens.length} (${encontrados} encontrados, ${hospedados} hospedados)`);
      continue;
    }
    encontrados++;

    try {
      const armazenado = await uploadImageFromUrl(BUCKET_LOGOS, `${bucketPrefixo}/${item.id}.png`, achado.url);
      await atualizar(item.id, armazenado.publicUrl);
      hospedados++;
      console.log(`OK: ${item.name} <- "${achado.tituloResolvido}" [${achado.descricao}] (${achado.nomeArquivo})`);
    } catch (error) {
      console.log(`Falha upload ${item.name}: ${error instanceof Error ? error.message : error}`);
    }

    if (processados % 25 === 0) console.log(`... ${processados}/${itens.length} (${encontrados} encontrados, ${hospedados} hospedados)`);
  }

  console.log(`=== ${label}: ${hospedados}/${itens.length} novos logos ===`);
  console.log("Sem match (amostra):", semMatch.slice(0, 30));
}

async function main() {
  if (!isStorageConfigured()) {
    console.log("Supabase Storage não configurado — abortando.");
    return;
  }
  await ensureLogoBucketsExist();

  const montadoras = await prisma.manufacturer.findMany({
    where: { logoUrl: null },
    select: { id: true, name: true },
  });
  await enriquecer(
    "Montadoras",
    montadoras,
    (id, logoUrl) => prisma.manufacturer.update({ where: { id }, data: { logoUrl } }),
    "montadoras",
    false
  );

  const fabricantesTodos = await prisma.tireManufacturer.findMany({
    where: { logoUrl: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const limite = process.argv[2] ? Number(process.argv[2]) : undefined;
  const fabricantes = limite ? fabricantesTodos.slice(0, limite) : fabricantesTodos;
  await enriquecer(
    "Fabricantes de pneu",
    fabricantes,
    (id, logoUrl) => prisma.tireManufacturer.update({ where: { id }, data: { logoUrl } }),
    "fabricantes-pneus",
    true
  );
}

main()
  .catch((e) => { console.error("Falha geral:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
