/**
 * Regras puras de medida de pneu e do recorte de ano do produto.
 *
 * Vive fora de `services/` porque `services/pesquisa.ts` é `server-only` e
 * estas regras precisam ser testáveis (e reutilizáveis no cliente) sem
 * arrastar o Prisma junto.
 */

/**
 * Recorte padrão do produto: veículos ainda fabricados em 2020 ou depois.
 * O corte é por fim de produção (yearEnd), não por lançamento — um modelo
 * lançado em 2018 que continuou saindo de fábrica em 2021 é atual e precisa
 * aparecer.
 */
export const ANO_MINIMO_PADRAO = 2020;

/**
 * Espelha `busca_medida_chave` do banco (migration 20260815190000): extrai a
 * tripla largura/perfil/aro de uma medida digitada em qualquer formato
 * ("205 55 16", "205/55 R16", "2055516"). Devolve null quando o texto não é
 * uma medida.
 *
 * A guarda de letras existe para que nome de veículo ("BMW X1 20") não seja
 * lido como medida. R e Z são aceitos por fazerem parte da notação (R16,
 * ZR17); C e X aparecem em sufixos de catálogo.
 */
export function medidaChave(texto: string): string | null {
  const alvo = (texto ?? "").toUpperCase();
  if (/[ABDEFGHIJKLMNOPQSTUVWY]/.test(alvo)) return null;

  const m = alvo.match(/(\d{3})\s*[/X-]?\s*(\d{2})\s*[ZR/-]*\s*(\d{2}(?:\.5)?)/);
  return m ? `${m[1]}/${m[2]}R${m[3]}` : null;
}
