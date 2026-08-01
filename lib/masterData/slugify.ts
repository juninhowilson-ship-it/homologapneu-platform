/**
 * Slug URL-safe a partir de um nome (ex.: "Continental" -> "continental",
 * "General Tire" -> "general-tire"). Distinto de normalizeLookupKey
 * (normalizeName.ts): aquele remove hífen de propósito (chave de
 * deduplicação, não precisa ser legível); este usa hífen como separador
 * de palavra (convenção padrão de slug), então as duas funções não podem
 * ser fundidas em uma só sem perder uma das duas propriedades.
 */
const DIACRITICS_REGEX = /[̀-ͯ]/g;

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
