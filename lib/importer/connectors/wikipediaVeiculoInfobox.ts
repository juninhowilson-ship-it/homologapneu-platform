import "server-only";
import { politeFetch } from "./scraperClient";

/**
 * Extrai dados reais de carroceria/tração/dimensões por MODELO a partir do
 * infobox padrão "Info/Automóvel" da Wikipédia em português. Usado para
 * complementar fontes que descrevem VERSÕES (ex.: PBE Veicular do INMETRO)
 * mas não informam carroceria — exigir essa informação de uma fonte real
 * evita ter que adivinhar a categoria do veículo (campo obrigatório no
 * schema) a partir do nome.
 *
 * O template "Info/Automóvel" tem variantes de nome de campo entre artigos
 * (ex.: "carroceria" vs "tipo de carroçaria"), por isso cada campo lógico
 * tenta uma lista de apelidos conhecidos, na ordem, e usa o primeiro que
 * existir. Se nenhum existir, o campo fica null — nunca é adivinhado.
 */

export type InfoboxVeiculo = {
  carroceria: string | null;
  segmento: string | null;
  tracao: string | null;
  wheelbase: number | null;
  weight: number | null;
  doors: number | null;
  /** Texto bruto de cada variante de motor listada no infobox — usado por
   * `extrairPotenciaTorque` para casar com o código de motor de cada
   * versão individual (uma busca de infobox é compartilhada por todas as
   * versões do mesmo modelo, mas cada uma pode ter um motor diferente). */
  motorVariantes: string[];
  sourceUrl: string;
};

function normalizarTitulo(marca: string, modelo: string): string {
  return `${marca}_${modelo}`.replace(/\s+/g, "_");
}

async function fetchWikitext(articleTitle: string): Promise<string | null> {
  const url = `https://pt.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
    articleTitle
  )}&prop=wikitext&format=json&section=0`;
  const response = await politeFetch(url, { headers: { Accept: "application/json" } }, 400);
  if (!response.ok) return null;
  const json = (await response.json()) as {
    error?: { info: string };
    parse?: { wikitext: { "*": string } };
  };
  if (json.error || !json.parse) return null;
  return json.parse.wikitext["*"];
}

function extrairBlocoTemplate(wikitext: string, nomeTemplate: string): string | null {
  const inicio = wikitext.toLowerCase().indexOf(`{{${nomeTemplate.toLowerCase()}`);
  if (inicio === -1) return null;

  let profundidade = 0;
  for (let i = inicio; i < wikitext.length - 1; i++) {
    const par = wikitext.slice(i, i + 2);
    if (par === "{{") {
      profundidade++;
      i++;
    } else if (par === "}}") {
      profundidade--;
      i++;
      if (profundidade === 0) return wikitext.slice(inicio, i + 1);
    }
  }
  return null;
}

function parseCampos(bloco: string): Record<string, string> {
  const campos: Record<string, string> = {};
  const linhas = bloco.split("\n");
  let campoAtual: string | null = null;

  for (const linha of linhas) {
    const match = linha.match(/^\s*\|\s*([a-zà-ú çãõáéíóúê-]+?)\s*=\s*(.*)$/i);
    if (match) {
      campoAtual = match[1].trim().toLowerCase();
      campos[campoAtual] = match[2];
    } else if (campoAtual) {
      // Preserva quebra de linha (em vez de virar espaço) para que listas
      // com marcador "* " em linhas separadas — usadas por algumas
      // infoboxes para vários motores, em vez de "<br/>" — continuem
      // detectáveis como variantes distintas por splitVariantes().
      campos[campoAtual] += `\n${linha.trim()}`;
    }
  }
  return campos;
}

function primeiroCampo(campos: Record<string, string>, apelidos: string[]): string | null {
  for (const apelido of apelidos) {
    if (campos[apelido]?.trim()) return campos[apelido].trim();
  }
  return null;
}

function limparMarcacaoWiki(texto: string): string {
  return texto
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref[^/]*\/>/gi, "")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[([^|\]]*\|)?([^\]]+)\]\]/g, "$2")
    .replace(/'''?/g, "")
    .trim();
}

function extrairPrimeiroNumero(texto: string, min: number, max: number): number | null {
  const matches = texto.match(/\d[\d.,]*/g);
  if (!matches) return null;
  for (const bruto of matches) {
    const valor = Number(bruto.replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(valor) && valor >= min && valor <= max) return Math.round(valor);
  }
  return null;
}

function splitVariantes(raw: string): string[] {
  return raw
    .split(/<br\s*\/?>|\n\s*\*+\s*/i)
    .map((s) => limparMarcacaoWiki(s))
    .filter(Boolean);
}

function extrairPortas(carroceriaRaw: string): number | null {
  const match = limparMarcacaoWiki(carroceriaRaw).match(/(\d)\s*portas?/i);
  if (!match) return null;
  const valor = Number(match[1]);
  return valor >= 2 && valor <= 6 ? valor : null;
}

/**
 * Extrai todos os valores de potência (cv) ou torque (kgf-m / Nm) de um
 * texto. Só deve ser chamada sobre o texto de UMA variante de motor já
 * identificada de forma inequívoca (ver `casarVariante`), nunca sobre o
 * campo inteiro com vários motores misturados.
 */
function extrairValores(texto: string, unidadeRegex: RegExp): string | null {
  const limpo = limparMarcacaoWiki(texto);
  const match = limpo.match(unidadeRegex);
  if (!match) return null;
  return `${match[1]} ${match[2]}`.trim();
}

function extrairDeslocamento(texto: string): number | null {
  const match = texto.match(/(\d+)[.,](\d+)\s*(?:l\b|litros?)?/i);
  if (!match) return null;
  return Number(`${match[1]}.${match[2]}`);
}

function extrairValvulas(texto: string): number | null {
  const match = texto.match(/(\d+)\s*v\b/i);
  return match ? Number(match[1]) : null;
}

/**
 * Localiza, entre as variantes de motor do infobox, a única cujo
 * deslocamento e número de válvulas batem com o código do motor
 * informado pela fonte de versões (ex.: PBE Veicular: "1.0-6V"). Só
 * retorna uma variante quando o casamento é inequívoco (exatamente uma
 * bate) — caso contrário retorna null, e nenhuma potência/torque é
 * atribuída, em vez de arriscar atribuir o valor errado.
 */
function casarVariante(variantes: string[], motorCodigoFonte: string): string | null {
  const deslocamentoAlvo = extrairDeslocamento(motorCodigoFonte);
  const valvulasAlvo = extrairValvulas(motorCodigoFonte);
  if (deslocamentoAlvo === null || valvulasAlvo === null) return null;

  const candidatas = variantes.filter((variante) => {
    const deslocamento = extrairDeslocamento(variante);
    const valvulas = extrairValvulas(variante);
    return deslocamento === deslocamentoAlvo && valvulas === valvulasAlvo;
  });

  return candidatas.length === 1 ? candidatas[0] : null;
}

function classificarCarroceria(raw: string): string | null {
  const texto = limparMarcacaoWiki(raw).toLowerCase();
  if (/picape|pick-?up/.test(texto)) return "PICAPE";
  if (/suv|utilit[aá]rio esportivo/.test(texto)) return "SUV";
  if (/perua|station\s*wagon/.test(texto)) return "PERUA";
  if (/minivan|monovolume/.test(texto)) return "MINIVAN";
  if (/cup[êe]|coupe/.test(texto)) return "COUPE";
  if (/sed[ãa]/.test(texto)) return "SEDAN";
  if (/hatch/.test(texto)) return "HATCH";
  return null;
}

function classificarSegmento(raw: string): string | null {
  const texto = limparMarcacaoWiki(raw).toLowerCase();
  if (/\bluxo\b/.test(texto)) return "LUXO";
  if (/premium/.test(texto)) return "PREMIUM";
  if (/popular/.test(texto)) return "POPULAR";
  if (/m[ée]dio/.test(texto)) return "MEDIO";
  return null;
}

function classificarTracao(raw: string): string | null {
  const texto = limparMarcacaoWiki(raw).toLowerCase();
  if (/tra[çc][ãa]o integral|awd|4x4|4wd/.test(texto)) return "INTEGRAL";
  if (/tra[çc][ãa]o traseira|rwd/.test(texto)) return "TRASEIRA";
  if (/tra[çc][ãa]o dianteira|fwd/.test(texto)) return "DIANTEIRA";
  return null;
}

const CARROCERIA_APELIDOS = ["carroceria", "tipo de carroçaria", "tipo de carroceria"];
const CLASSE_APELIDOS = ["classe"];
const LAYOUT_APELIDOS = ["layout", "tração"];
const ENTRE_EIXOS_APELIDOS = ["entre eixos", "distância entre os eixos", "entre-eixos"];
const PESO_APELIDOS = ["peso", "peso em ordem de marcha"];
const MOTOR_APELIDOS = ["motor", "motorização"];
const NUMERO = "\\d+(?:[.,]\\d+)?";
const POTENCIA_REGEX = new RegExp(`((?:${NUMERO}\\/)*${NUMERO})\\s*(cv)\\b`, "i");
const TORQUE_REGEX = new RegExp(`((?:${NUMERO}\\/)*${NUMERO})\\s*(kgf-?m|nm)\\b`, "i");

/**
 * Busca o infobox real do modelo na Wikipédia PT, no título previsível
 * "Marca_Modelo" (padrão observado nos artigos de carro em pt.wikipedia).
 * Retorna null se o artigo não existir ou não tiver o infobox esperado —
 * nunca tenta adivinhar a partir de outra fonte.
 */
export async function buscarInfoboxModelo(
  marca: string,
  modelo: string
): Promise<InfoboxVeiculo | null> {
  const titulo = normalizarTitulo(marca, modelo);
  const wikitext = await fetchWikitext(titulo);
  if (!wikitext) return null;

  const bloco = extrairBlocoTemplate(wikitext, "Info/Automóvel");
  if (!bloco) return null;

  const campos = parseCampos(bloco);

  const classeRaw = primeiroCampo(campos, CLASSE_APELIDOS);
  const carroceriaRaw = primeiroCampo(campos, CARROCERIA_APELIDOS);
  // Algumas variantes do infobox nao tem um campo "carroceria" proprio
  // (fica embutido num histórico de motores); nesse caso o texto de
  // "classe" (ex.: "Sedã Compacto") ainda e uma fonte real do mesmo
  // artigo e costuma conter a mesma palavra-chave de carroceria.
  const carroceria =
    (carroceriaRaw && classificarCarroceria(carroceriaRaw)) ||
    (classeRaw && classificarCarroceria(classeRaw)) ||
    null;
  if (!carroceria) return null;

  const segmento = classeRaw ? classificarSegmento(classeRaw) : null;

  const layoutRaw = primeiroCampo(campos, LAYOUT_APELIDOS);
  const tracao = layoutRaw ? classificarTracao(layoutRaw) : null;

  const entreEixosRaw = primeiroCampo(campos, ENTRE_EIXOS_APELIDOS);
  const wheelbase = entreEixosRaw ? extrairPrimeiroNumero(entreEixosRaw, 1500, 4500) : null;

  const pesoRaw = primeiroCampo(campos, PESO_APELIDOS);
  const weight = pesoRaw ? extrairPrimeiroNumero(pesoRaw, 500, 4000) : null;

  const doors = carroceriaRaw ? extrairPortas(carroceriaRaw) : null;

  const motorRaw = primeiroCampo(campos, MOTOR_APELIDOS);
  const motorVariantes = motorRaw ? splitVariantes(motorRaw) : [];

  return {
    carroceria,
    segmento,
    tracao,
    wheelbase,
    weight,
    doors,
    motorVariantes,
    sourceUrl: `https://pt.wikipedia.org/wiki/${titulo}`,
  };
}

/**
 * Extrai potência/torque para UMA versão específica, casando o código de
 * motor da fonte de versões (ex.: PBE Veicular: "1.0-6V") com a variante
 * de motor correspondente no infobox já obtido via `buscarInfoboxModelo`.
 * Sem casamento inequívoco (por deslocamento + válvulas), retorna null em
 * ambos — nunca atribui o valor de outra motorização por adivinhação.
 */
export function extrairPotenciaTorque(
  motorVariantes: string[],
  motorCodigoFonte: string
): { power: string | null; torque: string | null } {
  const variante =
    motorVariantes.length > 0
      ? casarVariante(motorVariantes, motorCodigoFonte)
      : null;
  if (!variante) return { power: null, torque: null };

  return {
    power: extrairValores(variante, POTENCIA_REGEX),
    torque: extrairValores(variante, TORQUE_REGEX),
  };
}
