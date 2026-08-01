/**
 * Funções puras de reconhecimento de texto usadas pela extração de
 * candidatos (lib/curadoria/extrairCandidatos.ts) — SEM "server-only" e
 * SEM dependência de Prisma, de propósito: assim tanto o pipeline real
 * (server-only) quanto scripts de diagnóstico/relatório standalone (que
 * não podem importar um módulo "server-only", ver AGENTS.md/CLAUDE.md e
 * os demais scripts/*.ts do projeto) reusam exatamente a mesma lógica —
 * nunca uma cópia que pode divergir da usada em produção.
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
  wheelSize: string | null;
  frontTirePressure: string | null;
  rearTirePressure: string | null;
  yearStart: number | null;
  yearEnd: number | null;
  extractionConfidence: number;
  rawSnippet: string;
};

export type Dicionario = {
  vehicleManufacturers: string[];
  vehicleModelsByManufacturer: Map<string, string[]>;
  vehicleVersionsByModel: Map<string, string[]>;
  tireManufacturers: string[];
  tireFamiliesByManufacturer: Map<string, string[]>;
};

export const TIRE_SIZE_REGEX = /\b(\d{3})\s?\/\s?(\d{2})\s?[Rr]\s?(\d{2})\b/g;
export const SPEED_INDEX_VALIDOS = new Set([
  "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8",
  "B", "C", "D", "E", "F", "G", "J", "K", "L", "M", "N", "P",
  "Q", "R", "S", "T", "U", "H", "V", "W", "Y", "Z", "ZR",
]);
export const YEAR_REGEX = /\b(19[9]\d|20[0-4]\d)\b/g;
/** Aro/roda: "6,5J x 16", "7Jx17", "8.5 J X 18" — ignora o offset ET que
 * às vezes segue (ex.: "8,5J x 18 ET56"), nunca capturado como se fosse
 * parte da medida da roda. */
export const WHEEL_SIZE_REGEX = /\b(\d{1,2}(?:[.,]\d)?)\s*J\s*[xX]\s*(\d{2})\b/g;
/** Pressão: valor numérico + unidade real (bar/psi/kgf por cm²) — nunca
 * um número solto sem unidade, para não confundir com índice de carga. */
export const PRESSURE_REGEX = /\b(\d{1,2}(?:[.,]\d)?)\s*(bar|psi|kgf\/cm[²2]?|kgf)\b/gi;
export const JANELA = 220;
/** Janela estreita para procurar a versão/trim — só imediatamente após o
 * nome do modelo já reconhecido, nunca na janela inteira (nomes de versão
 * costumam ser curtos — "XEi", "GTI" — e teriam falso-positivo alto se
 * buscados no texto todo, mesmo com limite de palavra). */
export const JANELA_VERSAO = 40;

function escapeRegExp(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Match de PALAVRA INTEIRA (limite \b nas duas pontas), não substring
 * solta. Sem isto, nomes curtos de 2-3 letras (ex.: "RAM", "MG", "GAC")
 * batiam dentro de palavras comuns do português — confirmado na prática:
 * "melhoram" continha "ram" e gerava um candidato falso com
 * vehicleManufacturerName="RAM" num manual da Volkswagen. Corrigido de
 * forma genérica aqui, não só para a montadora que expôs o problema —
 * beneficia toda busca por nome (montadora, modelo, versão, marca/família
 * de pneu).
 */
export function encontrarNaJanela(texto: string, candidatos: string[]): string | null {
  for (const candidato of candidatos) {
    const regex = new RegExp(`\\b${escapeRegExp(candidato)}\\b`, "i");
    if (regex.test(texto)) return candidato;
  }
  return null;
}

export function extrairIndices(janela: string, size: string): { loadIndex: string | null; speedIndex: string | null } {
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

/** Primeira medida de roda/aro (padrão "JxD") encontrada na janela —
 * dado bruto real, nunca inferido a partir da medida do pneu (o diâmetro
 * do pneu e o diâmetro da roda até costumam bater, mas isso seria
 * inferência, não extração). */
export function extrairRoda(janela: string): string | null {
  WHEEL_SIZE_REGEX.lastIndex = 0;
  const match = WHEEL_SIZE_REGEX.exec(janela);
  if (!match) return null;
  return `${match[1]}Jx${match[2]}`;
}

/** Pressão dianteira/traseira: só preenche quando o valor tem uma unidade
 * real de pressão (bar/psi/kgf) E o eixo aparece rotulado explicitamente
 * nos ~25 caracteres antes do número — nunca associa um valor a um eixo
 * por posição/ordem, o que seria adivinhação. Sem rótulo de eixo por
 * perto, o valor fica de fora (nenhum dos dois campos é preenchido). */
export function extrairPressoes(janela: string): { frontTirePressure: string | null; rearTirePressure: string | null } {
  let front: string | null = null;
  let rear: string | null = null;
  for (const match of janela.matchAll(PRESSURE_REGEX)) {
    const posicao = match.index ?? 0;
    const contextoAntes = janela.slice(Math.max(0, posicao - 25), posicao).toLowerCase();
    const valor = `${match[1]} ${match[2]}`;
    if (!front && /diant|front|dianteir/.test(contextoAntes)) front = valor;
    else if (!rear && /tras|rear|traseir/.test(contextoAntes)) rear = valor;
  }
  return { frontTirePressure: front, rearTirePressure: rear };
}

/**
 * Campos essenciais de IDENTIDADE (pneu+veículo): só os que dependem do
 * texto do documento, não do tamanho do catálogo de referência —
 * tireManufacturerName e vehicleManufacturerName batem contra listas
 * praticamente completas (fabricantes de pneu conhecidos, montadoras
 * comercializadas no Brasil), vehicleModel contra o catálogo real da
 * montadora já identificada, e tireSize é o próprio ponto de partida
 * (sempre presente).
 *
 * tireModel e vehicleVersion ficam DE FORA deste cálculo de propósito:
 * eles dependem de dicionários que ainda são pequenos (TireFamily tinha
 * só 12 famílias, versões só existem para os poucos modelos já
 * estruturados) — incluí-los aqui penalizaria todo candidato pela
 * imaturidade do catálogo, não por uma falha real de reconhecimento
 * neste documento. Cobertura desses dois fica medida à parte (ver
 * scripts/extraction-quality-report.ts) como "enriquecimento", não como
 * confiança essencial — e volta a entrar aqui organicamente conforme os
 * dicionários crescem (mesmo mecanismo de VehicleModel/VehicleVersion).
 */
export function calcularConfianca(c: Omit<CandidatoExtraido, "extractionConfidence" | "rawSnippet">): number {
  const campos = [
    c.tireManufacturerName,
    c.tireSize,
    c.vehicleManufacturerName,
    c.vehicleModel,
  ];
  const preenchidos = campos.filter(Boolean).length;
  return Math.round((preenchidos / campos.length) * 100);
}

/**
 * Reconhece um candidato completo a partir de uma janela de texto já
 * recortada ao redor de uma medida de pneu e do dicionário carregado do
 * banco. Função pura (sem I/O) — usada tanto pelo pipeline real quanto
 * por scripts de diagnóstico que já têm o texto (rawSnippet já salvo) e
 * só precisam re-rodar o reconhecimento, sem tocar no banco.
 */
export function reconhecerCandidato(
  janela: string,
  size: string,
  dicionario: Dicionario
): Omit<CandidatoExtraido, "extractionConfidence" | "rawSnippet"> {
  const { loadIndex, speedIndex } = extrairIndices(janela, size);

  const vehicleManufacturerName = encontrarNaJanela(janela, dicionario.vehicleManufacturers);
  let vehicleModel: string | null = null;
  let vehicleVersion: string | null = null;
  if (vehicleManufacturerName) {
    const modelos = dicionario.vehicleModelsByManufacturer.get(vehicleManufacturerName.toLowerCase()) ?? [];
    vehicleModel = encontrarNaJanela(janela, modelos);

    if (vehicleModel) {
      const posModelo = janela.toLowerCase().indexOf(vehicleModel.toLowerCase());
      if (posModelo !== -1) {
        const chaveVersao = `${vehicleManufacturerName.toLowerCase()}|${vehicleModel.toLowerCase()}`;
        const versoesDoModelo = dicionario.vehicleVersionsByModel.get(chaveVersao) ?? [];
        const janelaVersao = janela.slice(
          posModelo + vehicleModel.length,
          posModelo + vehicleModel.length + JANELA_VERSAO
        );
        vehicleVersion = encontrarNaJanela(janelaVersao, versoesDoModelo);
      }
    }
  }

  const tireManufacturerName = encontrarNaJanela(janela, dicionario.tireManufacturers);
  let tireModel: string | null = null;
  if (tireManufacturerName) {
    const familias = dicionario.tireFamiliesByManufacturer.get(tireManufacturerName.toLowerCase()) ?? [];
    tireModel = encontrarNaJanela(janela, familias);
  }

  const wheelSize = extrairRoda(janela);
  const { frontTirePressure, rearTirePressure } = extrairPressoes(janela);

  const anos = Array.from(janela.matchAll(YEAR_REGEX)).map((m) => Number(m[1]));
  const yearStart = anos.length > 0 ? Math.min(...anos) : null;
  const yearEnd = anos.length > 0 ? Math.max(...anos) : null;

  const runFlat = /run\s?-?\s?flat|\brft\b/i.test(janela) ? true : null;
  const xl = /\bxl\b|extra\s?load/i.test(janela) ? true : null;

  return {
    tireManufacturerName,
    tireModel,
    tireSize: size,
    loadIndex,
    speedIndex,
    runFlat,
    xl,
    vehicleManufacturerName,
    vehicleModel,
    vehicleVersion,
    wheelSize,
    frontTirePressure,
    rearTirePressure,
    yearStart,
    yearEnd,
  };
}
