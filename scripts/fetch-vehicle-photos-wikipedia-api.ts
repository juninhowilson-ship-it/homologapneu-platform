import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  isStorageConfigured,
  ensureLogoBucketsExist,
  uploadImageFromUrl,
  BUCKET_VEHICLE_IMAGES,
} from "../lib/storage/supabaseStorage";

/**
 * Terceira fonte de foto de veículo. As duas anteriores (Wikipédia PT via
 * infobox e Wikidata via P18) usam URLs de imagem em resolução original
 * (Special:FilePath / commons direto), que estão bloqueadas por rate
 * limit (429) do Wikimedia há dias. Descoberta desta sessão: pedindo uma
 * miniatura pela API do MediaWiki (`prop=pageimages&pithumbsize=`), o
 * upload.wikimedia.org devolve um caminho `/thumb/.../NNNpx-arquivo.jpg`
 * que NÃO está bloqueado (só o caminho de imagem original está). Por
 * isso forçamos um pithumbsize deliberadamente pequeno — se a imagem
 * original for menor que o pedido, a API ainda assim gera um `/thumb/`.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const THUMB_SIZE = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function marcaParaWikipedia(nome: string): string {
  // Siglas curtas (BMW, JAC, GAC, BYD, RAM, MG, KG...) precisam continuar
  // maiúsculas — títulos "Bmw 8 Series" não existem na Wikipédia. Só
  // normaliza o "GRITANDO EM CAPS" de marcas que são nomes normais
  // (ex.: "MERCEDES" -> "Mercedes"), não siglas.
  const éSigla = nome === nome.toUpperCase() && nome.replace(/[^A-Z]/g, "").length <= 4;
  return éSigla ? nome : paraTitleCase(nome);
}

function paraTitleCase(nome: string): string {
  // MediaWiki é case-sensitive além da 1ª letra — nomes "sujos" em CAIXA
  // ALTA (ex.: "LANDCRUISER") nunca bateriam com o título real da
  // Wikipédia ("Land Cruiser") sem normalizar o caso antes.
  return nome
    .toLowerCase()
    .split(/\s+/)
    .map((palavra) => (palavra.length > 0 ? palavra[0].toUpperCase() + palavra.slice(1) : palavra))
    .join(" ");
}

function limparNomeModelo(nome: string): string {
  // Remove sufixos de motorização/versão comuns nos nomes "sujos" legados
  // (ex.: "Vantage S Coupe 4.0 V8 680cv" -> "Vantage S Coupe"), e colchetes/
  // parênteses de anotação interna (ex.: "Arteon [VW 483]" -> "Arteon"),
  // mantendo o núcleo do nome que tem mais chance de bater com o título
  // da Wikipédia.
  const semSufixos = nome
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\b\d+[.,]\d+\b/g, "")
    .replace(/\b\d{2,4}\s?cv\b/gi, "")
    .replace(/\bv\d{1,2}\b/gi, "")
    .replace(/\baut\.?\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return paraTitleCase(semSufixos);
}

type ImagemEncontrada = { url: string; tituloResolvido: string };

async function buscarImagemWikipedia(titulo: string, dominio: "en" | "pt"): Promise<ImagemEncontrada | null> {
  const params = new URLSearchParams({
    action: "query",
    titles: titulo,
    prop: "pageimages",
    format: "json",
    pithumbsize: String(THUMB_SIZE),
    redirects: "1",
  });
  const resp = await fetch(`https://${dominio}.wikipedia.org/w/api.php?${params.toString()}`, {
    headers: { "User-Agent": "HomologaPneu/1.0 (contato via painel administrativo)" },
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const pages = data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0] as { title?: string; thumbnail?: { source?: string }; missing?: string } | undefined;
  if (!page || page.missing !== undefined || !page.thumbnail?.source) return null;
  return { url: page.thumbnail.source, tituloResolvido: page.title ?? titulo };
}

async function main() {
  if (!isStorageConfigured()) {
    console.log("Supabase Storage não configurado — abortando.");
    return;
  }
  await ensureLogoBucketsExist();

  const alvo = await prisma.vehicleModel.findMany({
    where: {
      photoUrl: null,
      // Nomes com "/" agrupam vários modelos numa linha só (dado legado
      // sujo) — não dá pra atribuir uma foto única com segurança.
      NOT: { name: { contains: "/" } },
      OR: [
        { versions: { some: { homologations: { some: {} } } } },
        { manufacturerApplications: { some: {} } },
      ],
    },
    include: { manufacturer: true },
    orderBy: { manufacturerId: "asc" },
  });
  const limite = process.argv[2] ? Number(process.argv[2]) : undefined;
  const lista = limite ? alvo.slice(0, limite) : alvo;
  console.log(`${lista.length}/${alvo.length} veículos reais ainda sem foto (elegíveis, sem nomes compostos)${limite ? ` [limitado a ${limite}]` : ""}.`);

  let encontrados = 0;
  let hospedados = 0;
  let processados = 0;
  const semMatch: string[] = [];
  const erros: { modelo: string; erro: string }[] = [];

  for (const v of lista) {
    processados++;
    const nomeLimpo = limparNomeModelo(v.name);
    const marcaLimpa = marcaParaWikipedia(v.manufacturer.name);

    // Guarda contra falso-positivo de desambiguação/redirecionamento
    // amplo da Wikipédia: exige que o título resolvido contenha pelo
    // menos um token do *modelo* (não só da montadora) — senão um nome
    // de variante específica (ex.: "Fielder") que redireciona pro artigo
    // genérico da linha (ex.: "Toyota Corolla") passaria como match válido
    // e traria a foto errada (carroceria/versão diferente da real).
    // Nomes de modelo curtos demais (ex.: "S", "4") são exatamente o caso
    // de maior risco (colidem com artigo genérico tipo letra/número) —
    // por isso o veículo inteiro é pulado, não só a comparação relaxada.
    // Tokens numéricos (ex.: o "6" de "Arrizo 6") ficam mesmo com 1
    // caractere — costumam ser a parte que mais distingue o modelo
    // exato (Arrizo 6 vs. Arrizo 5), diferente de conectivos como "a".
    const tokensModelo = nomeLimpo
      .split(/\s+/)
      .map((t) => t.toLowerCase())
      .filter((t) => t.length >= 2 || /\d/.test(t));
    if (tokensModelo.length === 0 || nomeLimpo.replace(/[^a-zA-Z0-9]/g, "").length < 3) {
      semMatch.push(`${v.manufacturer.name} ${v.name} (nome curto demais p/ buscar com segurança)`);
      continue;
    }

    // BMW/Mercedes usam "Série N" / "Classe N" nos nossos dados, mas a
    // Wikipédia em inglês titula como "N Series" / "N-Class".
    const nomeInvertidoSerie = nomeLimpo.match(/^S[ée]rie\s+(\S+)(.*)$/i);
    const nomeInvertidoClasse = nomeLimpo.match(/^Classe\s+(\S+)(.*)$/i);
    const candidatosNomeCompleto = [
      `${marcaLimpa} ${nomeLimpo}`,
      `${marcaLimpa} ${paraTitleCase(v.name)}`,
      ...(nomeInvertidoSerie ? [`${marcaLimpa} ${nomeInvertidoSerie[1]} Series${nomeInvertidoSerie[2]}`] : []),
      ...(nomeInvertidoClasse ? [`${marcaLimpa} ${nomeInvertidoClasse[1]}-Class${nomeInvertidoClasse[2]}`] : []),
    ];

    // Compara ignorando espaços/pontuação dos dois lados (ex.: nosso
    // "Landcruiser" precisa bater com o título real "Land Cruiser").
    // Tokens numéricos são o diferenciador mais preciso entre variantes
    // (Arrizo 6 vs. Arrizo 5) — por isso são exigidos TODOS, enquanto um
    // único token de palavra já basta (flexibilidade de fraseado).
    const semEspacos = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const relevanciaPara = (tokens: string[]) => {
      const tokensNumericos = tokens.filter((t) => /\d/.test(t));
      const tokensPalavra = tokens.filter((t) => !/\d/.test(t));
      return (titulo: string) => {
        const tituloSemEspacos = semEspacos(titulo);
        const numerosOk = tokensNumericos.every((t) => tituloSemEspacos.includes(semEspacos(t)));
        const palavraOk = tokensPalavra.length === 0 || tokensPalavra.some((t) => tituloSemEspacos.includes(semEspacos(t)));
        return numerosOk && palavraOk;
      };
    };

    // Boa parte do catálogo legado tem motorização/versão coladas dentro
    // do próprio campo de modelo (ex.: "Amarok Trendline CD 2.0 16V TDI
    // 4x4 Dies" — descoberta desta sessão: 85% dos veículos sem foto têm
    // esse padrão). `limparNomeModelo` já tira sufixo técnico solto, mas
    // não sabe onde termina o nome real da linha e começa o trim. Em vez
    // de reescrever o campo no banco (arriscado: duplicatas de
    // normalizedName por fabricante colidiriam), tentamos aqui, em
    // buscas sucessivas, prefixos cada vez mais curtos do nome já limpo
    // — 3 palavras, depois 2, depois 1 — até achar o artigo da linha
    // "mãe" na Wikipédia. Nunca inventa correspondência: a checagem de
    // relevância é refeita para cada prefixo, então o pior caso é não
    // achar nada (igual a antes), nunca achar errado.
    const tokensCortados = (n: number) => tokensModelo.slice(0, n).join(" ");
    const niveisDeTentativa: { candidatos: string[]; tokens: string[] }[] = [
      { candidatos: candidatosNomeCompleto, tokens: tokensModelo },
    ];
    for (const n of [3, 2, 1]) {
      if (tokensModelo.length <= n) continue;
      const prefixo = tokensCortados(n);
      // Prefixo de 1 palavra só é seguro se essa palavra não for curta
      // demais (mesmo critério, mais rígido, do corte "nome inteiro"
      // acima) — evita buscar por sigla ambígua tipo "GS" isolada.
      if (n === 1 && prefixo.replace(/[^a-zA-Z0-9]/g, "").length < 3) continue;
      niveisDeTentativa.push({
        candidatos: [`${marcaLimpa} ${paraTitleCase(prefixo)}`],
        tokens: tokensModelo.slice(0, n),
      });
    }

    let achado: ImagemEncontrada | null = null;
    for (const nivel of niveisDeTentativa) {
      const tituloPareceRelevante = relevanciaPara(nivel.tokens);
      for (const dominio of ["en", "pt"] as const) {
        for (const candidato of nivel.candidatos) {
          const resultado = await buscarImagemWikipedia(candidato, dominio);
          await sleep(150);
          if (resultado && tituloPareceRelevante(resultado.tituloResolvido)) {
            achado = resultado;
            break;
          }
        }
        if (achado) break;
      }
      if (achado) break;
    }
    if (!achado) {
      semMatch.push(`${v.manufacturer.name} ${v.name}`);
      if (processados % 25 === 0) {
        console.log(`... ${processados}/${lista.length} processados (${encontrados} encontrados, ${hospedados} hospedados)`);
      }
      continue;
    }
    encontrados++;

    try {
      const armazenado = await uploadImageFromUrl(BUCKET_VEHICLE_IMAGES, `modelos/${v.id}.jpg`, achado.url);
      await prisma.vehicleModel.update({ where: { id: v.id }, data: { photoUrl: armazenado.publicUrl } });
      hospedados++;
      console.log(`OK: ${v.manufacturer.name} ${v.name} <- "${achado.tituloResolvido}"`);
    } catch (error) {
      erros.push({ modelo: `${v.manufacturer.name} ${v.name}`, erro: error instanceof Error ? error.message : String(error) });
    }

    if (processados % 25 === 0) {
      console.log(`... ${processados}/${lista.length} processados (${encontrados} encontrados, ${hospedados} hospedados)`);
    }
  }

  console.log("=== RESUMO ===");
  console.log(JSON.stringify({
    alvo: lista.length,
    encontrados,
    hospedados,
    falhas: erros.length,
    semMatchAmostra: semMatch.slice(0, 40),
  }, null, 2));
}

main()
  .catch((e) => { console.error("Falha geral:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
