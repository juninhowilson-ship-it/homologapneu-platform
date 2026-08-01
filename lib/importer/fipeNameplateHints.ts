/**
 * Registro de nameplates multi-palavra conhecidos por montadora, usado
 * pela normalização FIPE (scripts/lib/fipeCatalog.ts) para separar
 * corretamente "{modelo real} {resto = versão}" quando o modelo real tem
 * mais de uma palavra (ex.: "Corolla Cross", "Hilux SW4") — sem isso, o
 * splitter ingênuo (primeira palavra = modelo) cortaria errado.
 *
 * Cada entrada é validada manualmente contra os dados reais da FIPE antes
 * de entrar aqui (mesmo processo usado para Toyota: levantar as versões,
 * conferir ano/combustível reais, checar colisões de prefixo) — nunca um
 * palpite. Uma montadora sem entrada aqui usa o fallback ingênuo (primeira
 * palavra), sinalizado como confiança menor pelo chamador.
 *
 * Ordem importa: prefixos mais longos/específicos primeiro, para não um
 * nameplate curto "engolir" um mais longo (ex.: "Corolla GR" antes de
 * "Corolla", com verificação de fronteira de palavra em fipeCatalog.ts).
 */
export const FIPE_NAMEPLATE_HINTS: Record<string, { prefixes: string[]; canonical?: Record<string, string> }> = {
  toyota: {
    prefixes: [
      "Corolla Cross",
      "Corolla Fielder",
      "Corolla GR",
      "Hilux SW4",
      "Land Cruiser Prado",
      "Land Cruiser",
      "Yaris Cross",
      "Yaris GR",
      "Band.",
      "Corolla",
      "Hilux",
      "Camry",
      "Celica",
      "Corona",
      "Etios",
      "ETIOS",
      "Hiace",
      "MR-2",
      "Paseo",
      "Previa",
      "Prius",
      "PRIUS",
      "RAV4",
      "Supra",
      "T-100",
      "Avalon",
      "Yaris",
      "YARIS",
    ],
    canonical: { "band.": "Bandeirante", etios: "Etios", yaris: "Yaris", prius: "Prius" },
  },
};

export function getNameplateHints(manufacturerName: string) {
  return FIPE_NAMEPLATE_HINTS[manufacturerName.trim().toLowerCase()];
}
