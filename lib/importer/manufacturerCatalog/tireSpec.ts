/**
 * Extrai as especificações estruturadas de um pneu (largura/perfil/aro,
 * índices de carga/velocidade, XL, run-flat, self-seal) a partir da
 * `medida` limpa e da `descricao` bruta de um catálogo de fabricante.
 * Função pura — nunca inventa um valor: quando `medida`/`descricao` não
 * batem com nenhum padrão reconhecido, retorna `null` (o chamador decide
 * o que fazer, nunca preenche com um placeholder).
 */

export type TireSizeSpec = {
  width: number;
  profile: number;
  rim: number;
};

export type TireIndexSpec = {
  loadIndex: string;
  speedIndex: string;
  xl: boolean;
  runFlat: boolean;
  /** "Seal Inside" da Pirelli — pneu autovedante. */
  seal: boolean;
};

const SIZE_REGEX = /^P?(?:LT)?(\d{2,3})\/(\d{2})(?:ZR|R)(\d{2})C?$/i;

/** Só reconhece o formato padrão ###/##R## (ou variantes ZR/LT/C) — os
 * poucos formatos fora do padrão (ex.: "185R14", "31X10.50R15") retornam
 * `null` em vez de arriscar width/profile inventados. */
export function parseTireSize(medida: string): TireSizeSpec | null {
  const match = medida.trim().match(SIZE_REGEX);
  if (!match) return null;
  return {
    width: Number(match[1]),
    profile: Number(match[2]),
    rim: Number(match[3]),
  };
}

const INDEX_REGEX = /\b(\d{2,3})([A-Z])\b/;

/** Busca o primeiro par índice-de-carga+índice-de-velocidade (ex.: "91V",
 * "104H") na descrição — ignora o eventual índice alternativo entre
 * parênteses de pneus de duplo uso (ex.: "104R(97T)"). `null` quando a
 * descrição não declara nenhum índice (não assume um valor típico). */
export function parseTireIndex(descricao: string): TireIndexSpec | null {
  const match = descricao.match(INDEX_REGEX);
  if (!match) return null;

  return {
    loadIndex: match[1],
    speedIndex: match[2].toUpperCase(),
    xl: /\bXL\b/i.test(descricao),
    runFlat: /^r-f\b/i.test(descricao.trim()),
    seal: /^s-i\b/i.test(descricao.trim()),
  };
}
