import "server-only";
import { prisma } from "@/lib/prisma";
import type { ParsedFile } from "@/lib/importer/parsers/types";
import {
  TIRE_SIZE_REGEX,
  JANELA,
  calcularConfianca,
  reconhecerCandidato,
  type CandidatoExtraido,
  type Dicionario,
} from "@/lib/curadoria/extracaoPura";

export type { CandidatoExtraido };

/**
 * Extração determinística (não-LLM) de candidatos a partir de um
 * documento já convertido em texto/linhas (ParsedFile). NUNCA inventa:
 * marca/modelo/versão de veículo, família de pneu e fabricante de pneu só
 * entram num candidato quando batem, por match de palavra inteira
 * (case-insensitive), com um nome já cadastrado no banco — medida/índice/
 * ano/roda/pressão só entram quando o padrão real (regex) aparece no
 * texto, e pressão só quando o eixo (dianteiro/traseiro) está rotulado
 * explicitamente por perto. Campos que não forem encontrados ficam nulos
 * — nunca preenchidos por suposição.
 *
 * O reconhecimento em si (regex + cruzamento com o dicionário) é uma
 * função pura em lib/curadoria/extracaoPura.ts — este arquivo só carrega
 * o dicionário real do banco (por isso "server-only") e recorta as
 * janelas de texto ao redor de cada medida de pneu encontrada.
 *
 * Uma integração com um modelo de linguagem (Claude/outro) poderia
 * substituir/complementar esta função no futuro para reconhecer
 * variações de escrita mais livres, mas exigiria uma chave de API que
 * não está configurada neste ambiente — por isso a extração hoje é
 * 100% baseada em padrões e cruzamento com dados reais já cadastrados.
 */

export async function carregarDicionario(): Promise<Dicionario> {
  const [manufacturers, models, versions, tireManufacturers, tireFamilies] = await Promise.all([
    prisma.manufacturer.findMany({ select: { name: true } }),
    prisma.vehicleModel.findMany({
      select: { name: true, manufacturer: { select: { name: true } } },
    }),
    prisma.vehicleVersion.findMany({
      select: { name: true, vehicleModel: { select: { name: true, manufacturer: { select: { name: true } } } } },
    }),
    prisma.tireManufacturer.findMany({ select: { name: true } }),
    prisma.tireFamily.findMany({ select: { name: true, tireManufacturer: { select: { name: true } } } }),
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

  const vehicleVersionsByModel = new Map<string, string[]>();
  for (const v of versions) {
    const chave = `${v.vehicleModel.manufacturer.name.toLowerCase()}|${v.vehicleModel.name.toLowerCase()}`;
    if (!vehicleVersionsByModel.has(chave)) vehicleVersionsByModel.set(chave, []);
    vehicleVersionsByModel.get(chave)!.push(v.name);
  }
  for (const lista of vehicleVersionsByModel.values()) {
    lista.sort((a, b) => b.length - a.length);
  }

  const tireFamiliesByManufacturer = new Map<string, string[]>();
  for (const f of tireFamilies) {
    const chave = f.tireManufacturer.name.toLowerCase();
    if (!tireFamiliesByManufacturer.has(chave)) tireFamiliesByManufacturer.set(chave, []);
    tireFamiliesByManufacturer.get(chave)!.push(f.name);
  }
  for (const lista of tireFamiliesByManufacturer.values()) {
    lista.sort((a, b) => b.length - a.length);
  }

  return {
    vehicleManufacturers: manufacturers.map((m) => m.name).sort((a, b) => b.length - a.length),
    vehicleModelsByManufacturer,
    vehicleVersionsByModel,
    tireManufacturers: tireManufacturers.map((m) => m.name).sort((a, b) => b.length - a.length),
    tireFamiliesByManufacturer,
  };
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

    const base = reconhecerCandidato(janela, size, dicionario);

    candidatos.push({
      ...base,
      extractionConfidence: calcularConfianca(base),
      rawSnippet: janela.trim(),
    });
  }

  return candidatos;
}
