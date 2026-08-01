/**
 * Normalização canônica de chave de deduplicação de master data (Etapa 1 —
 * Manufacturer/VehicleModel; Etapa 2 — VehicleGeneration; futuro — Engine,
 * Platform). Minúsculas, sem acento, hífen/underscore removidos, espaços
 * colapsados e aparados. Usada exclusivamente como chave de comparação/
 * unicidade — nunca para exibição (o campo `name` original, como a fonte
 * informou, é sempre preservado).
 *
 * Hífen/underscore são removidos (não substituídos por espaço) para unificar
 * variantes de formatação real do mesmo código (ex.: "E-170"/"E170"). Outros
 * caracteres especiais (ex.: "+", "/") são deliberadamente preservados —
 * testado contra os dados reais desta base antes de decidir (Etapa 2): uma
 * remoção mais agressiva colidiria "Ranger Limited" com "Ranger Limited+" e
 * "Jimny Sierra 4YOU" com "Jimny Sierra 4YOU+", que são trims genuinamente
 * distintos, não duplicatas.
 *
 * Sem `server-only`: precisa ser importável tanto pelo app (via
 * repositories/*, sob o guard de server-only) quanto por scripts standalone
 * (scripts/lib/fipeCatalog.ts, prisma/seed.ts) executados fora do pipeline
 * do Next — mesma razão pela qual lib/masterData/resolve*.ts também não tem
 * o guard.
 */
const DIACRITICS_REGEX = /[̀-ͯ]/g;
const HYPHEN_UNDERSCORE_REGEX = /[-_]/g;

export function normalizeLookupKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .replace(HYPHEN_UNDERSCORE_REGEX, "")
    .trim()
    .replace(/\s+/g, " ");
}
