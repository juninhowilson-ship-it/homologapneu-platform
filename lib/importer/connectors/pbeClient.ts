import "server-only";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

/**
 * PBE Veicular (Programa Brasileiro de Etiquetagem Veicular), publicado
 * pelo INMETRO — tabela oficial do governo com consumo/emissões por
 * marca/modelo/versão, incluindo motor, tipo de propulsão, transmissão e
 * combustível reais de cada versão vendida no Brasil. Só existe em PDF
 * (não há CSV/API — confirmado junto ao portal dados.gov.br e ao site do
 * INMETRO). URL fixa da edição mais recente conhecida; atualizar quando o
 * INMETRO publicar uma nova edição.
 */
export const PBE_PDF_URL =
  "https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular/mascara-pbev-2026_19_jan-rev01.pdf/@@download/file";
export const PBE_TABLE_YEAR = 2026;

export type PbeRow = {
  marca: string;
  modelo: string;
  versao: string;
  motor: string;
  tipoPropulsao: string;
  transmissao: string;
  combustivelCode: string;
};

const MOTOR_PATTERN = /^\d+(\.\d+)?L?T?\s*-?\s*\d+\s*V(\s+[A-Z]+)?$/i;
const ELETRICO_MOTOR_PATTERN = /^(el[ée]trico|n\.a\.?)$/i;
const TRANSMISSAO_PATTERN = /^(M|A|CVT|MTA|DCT)-?\d*$/i;
const COMBUSTIVEL_CODES = new Set(["F", "G", "D", "E", "H", "ND"]);

/**
 * A tabela PBE usa siglas para algumas marcas que não correspondem ao
 * nome comercial cadastrado em Manufacturer (verificado manualmente
 * contra a edição 2026 — mesmo espírito do ALIAS_MAP de fipeClient.ts).
 */
const PBE_MARCA_ALIASES: Record<string, string> = {
  VW: "Volkswagen",
};

/**
 * Verifica se o binário `pdftotext` (poppler/xpdf) está disponível no
 * ambiente. Sem ele não há como extrair a tabela do PDF — o conector
 * reporta como não configurado em vez de falhar. Síncrono porque
 * `ImportConnector.isConfigured()` não é assíncrono.
 */
export function isPdftotextAvailable(): boolean {
  try {
    // `-v` do xpdf/poppler sai com código != 0 por convenção própria da
    // ferramenta mesmo quando ela está instalada e funcionando — o que
    // importa aqui é apenas se o binário existe e pôde ser executado
    // (ENOENT indica o contrário), não o código de saída do comando.
    execFileSync("pdftotext", ["-v"], { stdio: "ignore" });
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ENOENT";
  }
}

async function baixarPdf(): Promise<string> {
  const response = await fetch(PBE_PDF_URL, {
    headers: { "User-Agent": "HomologaPneu-DataImport/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Falha ao baixar a tabela PBE Veicular: HTTP ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const path = join(tmpdir(), `pbe-veicular-${Date.now()}.pdf`);
  await writeFile(path, bytes);
  return path;
}

async function extrairTextoTabela(pdfPath: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "pdftotext",
    ["-table", "-enc", "UTF-8", pdfPath, "-"],
    { maxBuffer: 1024 * 1024 * 50 }
  );
  return stdout;
}

/**
 * Faz o parsing de uma linha já extraída pelo `pdftotext -table`. As
 * colunas da tabela original ficam separadas por 2+ espaços quando
 * renderizadas nesse modo. A coluna "Categoria" (mais à esquerda) tem
 * largura variável e às vezes quebra em múltiplos tokens — por isso o
 * parser ignora tudo antes do token que corresponde a uma marca
 * conhecida, em vez de depender de posição fixa.
 *
 * Só aceita a linha se motor/transmissão/combustível baterem com os
 * padrões esperados; caso contrário descarta (nunca adivinha valores).
 */
/**
 * Em algumas linhas o espaçamento extra da coluna de versão faz o
 * `pdftotext -table` quebrar "A-6"/"M-5" em 3 tokens ("A", "-", "6") em
 * vez de um só. Reagrupa esse padrão especifico antes do parsing — é uma
 * correção de um artefato de extração, não uma inferência de dado.
 */
function reagruparTransmissaoQuebrada(tokens: string[]): string[] {
  const resultado: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (
      /^(M|A|CVT|MTA|DCT)$/i.test(tokens[i]) &&
      tokens[i + 1] === "-" &&
      /^\d+$/.test(tokens[i + 2] ?? "")
    ) {
      resultado.push(`${tokens[i]}-${tokens[i + 2]}`);
      i += 2;
    } else {
      resultado.push(tokens[i]);
    }
  }
  return resultado;
}

export function parseLinha(
  linha: string,
  nomesCanonicos: Map<string, string>
): PbeRow | null {
  const tokens = reagruparTransmissaoQuebrada(
    linha
      .split(/\s{2,}/)
      .map((t) => t.trim())
      .filter(Boolean)
  );

  const marcaIndex = tokens.findIndex((t) => nomesCanonicos.has(t.toUpperCase()));
  if (marcaIndex === -1 || tokens.length < marcaIndex + 9) return null;

  const [marcaRaw, modelo, versao, motor, tipoPropulsao, transmissao, , , combustivelCode] =
    tokens.slice(marcaIndex);

  if (!modelo || !versao || !motor || !transmissao || !combustivelCode) return null;
  if (!MOTOR_PATTERN.test(motor) && !ELETRICO_MOTOR_PATTERN.test(motor)) return null;
  if (!TRANSMISSAO_PATTERN.test(transmissao) && tipoPropulsao.toLowerCase() !== "elétrico")
    return null;
  if (!COMBUSTIVEL_CODES.has(combustivelCode.toUpperCase())) return null;

  return {
    marca: nomesCanonicos.get(marcaRaw.toUpperCase()) as string,
    modelo,
    versao,
    motor,
    tipoPropulsao,
    transmissao,
    combustivelCode: combustivelCode.toUpperCase(),
  };
}

export function parseTabela(texto: string, nomesCanonicos: Map<string, string>): PbeRow[] {
  const rows: PbeRow[] = [];
  for (const linha of texto.split("\n")) {
    const row = parseLinha(linha, nomesCanonicos);
    if (row) rows.push(row);
  }
  return rows;
}

/**
 * Monta o mapa TOKEN-DA-TABELA-PBE (maiúsculas) -> nome canônico do
 * Manufacturer, a partir dos nomes reais já cadastrados, incluindo os
 * apelidos conhecidos (ex.: "VW" -> "Volkswagen").
 */
export function buildNomesCanonicos(nomesReais: string[]): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const nome of nomesReais) {
    mapa.set(nome.toUpperCase(), nome);
  }
  for (const [sigla, nomeReal] of Object.entries(PBE_MARCA_ALIASES)) {
    if (mapa.has(nomeReal.toUpperCase())) {
      mapa.set(sigla.toUpperCase(), nomeReal);
    }
  }
  return mapa;
}

/**
 * Baixa e extrai a tabela PBE Veicular completa, filtrando apenas as
 * linhas cuja marca já existe cadastrada em Manufacturer (evita
 * confiar em marcas desconhecidas/grafias divergentes sem revisão).
 */
export async function fetchPbeRows(nomesReais: string[]): Promise<PbeRow[]> {
  const nomesCanonicos = buildNomesCanonicos(nomesReais);
  const pdfPath = await baixarPdf();
  try {
    const texto = await extrairTextoTabela(pdfPath);
    return parseTabela(texto, nomesCanonicos);
  } finally {
    await unlink(pdfPath).catch(() => undefined);
  }
}
