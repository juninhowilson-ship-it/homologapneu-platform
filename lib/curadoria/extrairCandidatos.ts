import "server-only";
import { prisma } from "@/lib/prisma";
import type { ParsedFile } from "@/lib/importer/parsers/types";

/**
 * Extração determinística (não-LLM) de candidatos a partir de um
 * documento já convertido em texto/linhas (ParsedFile). NUNCA inventa:
 * marca/modelo de veículo e fabricante de pneu só entram num candidato
 * quando batem, por substring exata (case-insensitive), com um nome já
 * cadastrado no banco — medida/índice/ano só entram quando o padrão real
 * (regex) aparece no texto. Campos que não forem encontrados ficam nulos
 * — nunca preenchidos por suposição.
 *
 * Uma integração com um modelo de linguagem (Claude/outro) poderia
 * substituir/complementar esta função no futuro para reconhecer
 * variações de escrita mais livres, mas exigiria uma chave de API que
 * não está configurada neste ambiente — por isso a extração hoje é
 * 100% baseada em padrões e cruzamento com dados reais já cadastrados.
 */

export type CandidatoExtraido = {
  tireManufacturerName: string | null;
  tireModel: string | null;
  tireSize: string | null;
  loadIndex: string | null;
  speedIndex: string | null;
  runFlat: boolean | null;
  xl: boolean | null;
  vehicleManufacturerName: string | null;
  vehicleModel: string | null;
  vehicleVersion: string | null;
  yearStart: number | null;
  yearEnd: number | null;
  extractionConfidence: number;
  rawSnippet: string;
};

const TIRE_SIZE_REGEX = /\b(\d{3})\s?\/\s?(\d{2})\s?[Rr]\s?(\d{2})\b/g;
const SPEED_INDEX_VALIDOS = new Set([
  "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8",
  "B", "C", "D", "E", "F", "G", "J", "K", "L", "M", "N", "P",
  "Q", "R", "S", "T", "U", "H", "V", "W", "Y", "Z", "ZR",
]);
const YEAR_REGEX = /\b(19[9]\d|20[0-4]\d)\b/g;
const JANELA = 220;

type Dicionario = {
  vehicleManufacturers: string[];
  vehicleModelsByManufacturer: Map<string, string[]>;
  tireManufacturers: string[];
};

async function carregarDicionario(): Promise<Dicionario> {
  const [manufacturers, models, tireManufacturers] = await Promise.all([
    prisma.manufacturer.findMany({ select: { name: true } }),
    prisma.vehicleModel.findMany({
      select: { name: true, manufacturer: { select: { name: true } } },
    }),
    prisma.tireManufacturer.findMany({ select: { name: true } }),
  ]);

  const vehicleModelsByManufacturer = new Map<string, string[]>();
  for (const m of models) {
    const chave = m.manufacturer.name.toLowerCase();
    if (!vehicleModelsByManufacturer.has(chave)) vehicleModelsByManufacturer.set(chave, []);
    vehicleModelsByManufacturer.get(chave)!.push(m.name);
  }
  // Modelos mais longos primeiro, para casar "Argo Trekking" antes de "Argo".
  for (const lista of vehicleModelsByManufacturer.values()) {
    lista.sort((a, b) => b.length - a.length);
  }

  return {
    vehicleManufacturers: manufacturers.map((m) => m.name).sort((a, b) => b.length - a.length),
    vehicleModelsByManufacturer,
    tireManufacturers: tireManufacturers.map((m) => m.name).sort((a, b) => b.length - a.length),
  };
}

function encontrarNaJanela(texto: string, candidatos: string[]): string | null {
  const textoLower = texto.toLowerCase();
  for (const candidato of candidatos) {
    if (textoLower.includes(candidato.toLowerCase())) return candidato;
  }
  return null;
}

function extrairIndices(janela: string, size: string): { loadIndex: string | null; speedIndex: string | null } {
  const posSize = janela.indexOf(size);
  if (posSize === -1) return { loadIndex: null, speedIndex: null };
  const depois = janela.slice(posSize + size.length, posSize + size.length + 15);
  const match = depois.match(/\s*(\d{2,3})\s*([A-Za-z]{1,2})\b/);
  if (!match) return { loadIndex: null, speedIndex: null };
  const speedCandidato = match[2].toUpperCase();
  return {
    loadIndex: match[1],
    speedIndex: SPEED_INDEX_VALIDOS.has(speedCandidato) ? speedCandidato : null,
  };
}

function calcularConfianca(c: Omit<CandidatoExtraido, "extractionConfidence" | "rawSnippet">): number {
  const campos = [
    c.tireManufacturerName,
    c.tireModel,
    c.tireSize,
    c.vehicleManufacturerName,
    c.vehicleModel,
  ];
  const preenchidos = campos.filter(Boolean).length;
  return Math.round((preenchidos / campos.length) * 100);
}

/**
 * Recebe o ParsedFile já extraído (CSV/XLSX/PDF, via lib/importer/parseFile.ts)
 * e retorna os candidatos reconhecidos. Nunca lança por não encontrar nada
 * — retorna lista vazia, que o revisor humano pode complementar manualmente
 * fora deste pipeline se quiser.
 */
export async function extrairCandidatos(arquivo: ParsedFile): Promise<CandidatoExtraido[]> {
  const dicionario = await carregarDicionario();

  const textoCompleto = arquivo.rows
    .map((linha) => Object.values(linha).join(" "))
    .join("\n");

  const candidatos: CandidatoExtraido[] = [];
  const tamanhosVistos = new Set<string>();

  for (const match of textoCompleto.matchAll(TIRE_SIZE_REGEX)) {
    const size = `${match[1]}/${match[2]}R${match[3]}`;
    const posicao = match.index ?? 0;
    const inicioJanela = Math.max(0, posicao - JANELA);
    const fimJanela = Math.min(textoCompleto.length, posicao + size.length + JANELA);
    const janela = textoCompleto.slice(inicioJanela, fimJanela);

    // Evita duplicar o mesmo candidato quando a mesma medida aparece várias
    // vezes exatamente na mesma janela de contexto (ex.: repetida no
    // cabeçalho e no corpo do texto).
    const chaveJanela = `${size}|${janela.slice(0, 80)}`;
    if (tamanhosVistos.has(chaveJanela)) continue;
    tamanhosVistos.add(chaveJanela);

    const { loadIndex, speedIndex } = extrairIndices(janela, size);

    const vehicleManufacturerName = encontrarNaJanela(janela, dicionario.vehicleManufacturers);
    let vehicleModel: string | null = null;
    if (vehicleManufacturerName) {
      const modelos = dicionario.vehicleModelsByManufacturer.get(vehicleManufacturerName.toLowerCase()) ?? [];
      vehicleModel = encontrarNaJanela(janela, modelos);
    }

    const tireManufacturerName = encontrarNaJanela(janela, dicionario.tireManufacturers);

    const anos = Array.from(janela.matchAll(YEAR_REGEX)).map((m) => Number(m[1]));
    const yearStart = anos.length > 0 ? Math.min(...anos) : null;
    const yearEnd = anos.length > 0 ? Math.max(...anos) : null;

    const runFlat = /run\s?-?\s?flat|\brft\b/i.test(janela) ? true : null;
    const xl = /\bxl\b|extra\s?load/i.test(janela) ? true : null;

    const base = {
      tireManufacturerName,
      tireModel: null,
      tireSize: size,
      loadIndex,
      speedIndex,
      runFlat,
      xl,
      vehicleManufacturerName,
      vehicleModel,
      vehicleVersion: null,
      yearStart,
      yearEnd,
    };

    candidatos.push({
      ...base,
      extractionConfidence: calcularConfianca(base),
      rawSnippet: janela.trim(),
    });
  }

  return candidatos;
}
