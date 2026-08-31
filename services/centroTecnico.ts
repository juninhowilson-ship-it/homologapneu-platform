import "server-only";
import { prisma } from "@/lib/prisma";
import {
  obterAplicacoesDeclaradas,
  type AplicacoesDeclaradas,
} from "@/services/aplicacoesFabricante";

export type PneuFicha = {
  tireId: number;
  marca: string;
  modelo: string;
  medida: string;
  /** "91V XL Run Flat" — atributos que só aparecem quando existem. */
  especificacao: string;
  papel: "ORIGINAL" | "OPCIONAL" | "SUBSTITUTO";
  homologacaoAno: number;
};

export type AlternativaMedida = {
  medida: string;
  /** Pneus da mesma medida de OUTRAS marcas presentes na base. */
  pneus: {
    tireId: number;
    marca: string;
    modelo: string;
    especificacao: string;
    /** true quando esse pneu é original de fábrica em algum outro veículo. */
    originalEmOutroVeiculo: boolean;
  }[];
  /**
   * Ofertas do catálogo comercial (Intelli Tire) na mesma medida — responde
   * "o que dá para comprar hoje". NÃO é homologação: é disponibilidade de
   * mercado, exibida como tal.
   */
  comerciais: {
    id: number;
    marca: string;
    modelo: string;
    especificacao: string;
    /** Marcação de fábrica no flanco (MOE, AO, K1...), quando o SKU declara. */
    marcacaoOe: string | null;
  }[];
};

export type FichaTecnica = {
  vehicleVersionId: number;
  imagemUrl: string | null;
  /**
   * Atribuicao da foto. As imagens vindas do Radar Automotivo SP sao do
   * Wikimedia Commons sob CC BY / CC BY-SA — exibir sem credito viola a
   * licenca, entao a UI depende deste campo.
   */
  imagemCredito: string | null;
  logoMontadoraUrl: string | null;
  pneus: PneuFicha[];
  alternativas: AlternativaMedida[];
  /**
   * Preenchido só quando o veículo NÃO tem homologação confirmada: o que o
   * catálogo do fabricante do pneu declara para o modelo. Não é homologação
   * — ver services/aplicacoesFabricante.ts.
   */
  declaradas: AplicacoesDeclaradas | null;
};

/** "91V XL Run Flat" — só inclui o que o pneu realmente tem. */
function montarEspecificacao(tire: {
  loadIndex: string;
  speedIndex: string;
  xl: boolean;
  runFlat: boolean;
  seal: boolean;
}): string {
  return [
    `${tire.loadIndex}${tire.speedIndex}`,
    tire.xl ? "XL" : null,
    tire.runFlat ? "Run Flat" : null,
    tire.seal ? "Seal" : null,
  ]
    .filter(Boolean)
    .join(" ");
}

const MAX_ALTERNATIVAS_POR_MEDIDA = 6;

/**
 * Ficha técnica do Centro Técnico: pneus homologados do veículo (sem os
 * campos de catálogo que não interessam ao consultor) e, para cada medida,
 * quais pneus de OUTRAS marcas existem na base naquela mesma medida — a
 * pergunta prática de quem precisa substituir o pneu original.
 */
export async function obterFichaTecnica(
  vehicleVersionId: number
): Promise<FichaTecnica | null> {
  const versao = await prisma.vehicleVersion.findUnique({
    where: { id: vehicleVersionId },
    select: {
      id: true,
      images: { select: { type: true, url: true, credit: true } },
      vehicleModel: {
        select: {
          photoUrl: true,
          manufacturer: { select: { logoUrl: true } },
        },
      },
      homologations: {
        where: { deletedAt: null },
        orderBy: { year: "desc" },
        select: {
          year: true,
          tires: {
            select: {
              role: true,
              tire: {
                select: {
                  id: true,
                  model: true,
                  size: true,
                  loadIndex: true,
                  speedIndex: true,
                  xl: true,
                  runFlat: true,
                  seal: true,
                  deletedAt: true,
                  tireManufacturer: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!versao) return null;

  const pneus: PneuFicha[] = [];
  const vistos = new Set<number>();

  for (const homologacao of versao.homologations) {
    for (const item of homologacao.tires) {
      const tire = item.tire;
      if (tire.deletedAt || vistos.has(tire.id)) continue;
      vistos.add(tire.id);

      pneus.push({
        tireId: tire.id,
        marca: tire.tireManufacturer.name,
        modelo: tire.model,
        medida: tire.size,
        especificacao: montarEspecificacao(tire),
        papel: item.role,
        homologacaoAno: homologacao.year,
      });
    }
  }

  // Ordena: originais primeiro, depois por medida
  pneus.sort((a, b) => {
    if (a.papel !== b.papel) return a.papel === "ORIGINAL" ? -1 : 1;
    return a.medida.localeCompare(b.medida);
  });

  const medidas = Array.from(new Set(pneus.map((p) => p.medida)));
  const marcasJaHomologadas = new Set(pneus.map((p) => `${p.medida}|${p.marca}`));

  const alternativas: AlternativaMedida[] = [];

  // Catálogo comercial (Intelli Tire) nas mesmas medidas — os mais vendidos
  const ofertasPorMedida = new Map<
    string,
    { id: number; brand: string; model: string; loadIndex: string | null; speedIndex: string | null; oeMarking: string | null }[]
  >();

  if (medidas.length > 0) {
    const ofertas = await prisma.commercialTireOffer.findMany({
      where: { size: { in: medidas } },
      orderBy: { soldUnits: "desc" },
      select: {
        id: true,
        brand: true,
        model: true,
        size: true,
        loadIndex: true,
        speedIndex: true,
        oeMarking: true,
      },
    });
    for (const oferta of ofertas) {
      const lista = ofertasPorMedida.get(oferta.size) ?? [];
      if (lista.length < MAX_ALTERNATIVAS_POR_MEDIDA) {
        lista.push(oferta);
        ofertasPorMedida.set(oferta.size, lista);
      }
    }
  }

  if (medidas.length > 0) {
    const candidatos = await prisma.tire.findMany({
      where: {
        size: { in: medidas },
        deletedAt: null,
        id: { notIn: Array.from(vistos) },
      },
      select: {
        id: true,
        model: true,
        size: true,
        loadIndex: true,
        speedIndex: true,
        xl: true,
        runFlat: true,
        seal: true,
        tireManufacturer: { select: { name: true } },
        homologationTires: { select: { role: true }, take: 5 },
      },
      orderBy: [{ tireManufacturer: { name: "asc" } }, { model: "asc" }],
    });

    for (const medida of medidas) {
      const daMedida = candidatos
        .filter((t) => t.size === medida)
        // Só marcas diferentes das que já constam como homologadas
        .filter((t) => !marcasJaHomologadas.has(`${medida}|${t.tireManufacturer.name}`))
        .slice(0, MAX_ALTERNATIVAS_POR_MEDIDA)
        .map((t) => ({
          tireId: t.id,
          marca: t.tireManufacturer.name,
          modelo: t.model,
          especificacao: montarEspecificacao(t),
          originalEmOutroVeiculo: t.homologationTires.some(
            (h) => h.role === "ORIGINAL"
          ),
        }));

      const comerciais = (ofertasPorMedida.get(medida) ?? []).map((o) => ({
        id: o.id,
        marca: o.brand,
        modelo: o.model,
        especificacao: [o.loadIndex, o.speedIndex].filter(Boolean).join(""),
        marcacaoOe: o.oeMarking,
      }));

      if (daMedida.length > 0 || comerciais.length > 0) {
        alternativas.push({ medida, pneus: daMedida, comerciais });
      }
    }
  }

  const imagem =
    versao.images.find((img) => img.type === "PRINCIPAL") ??
    versao.images[0] ??
    null;

  return {
    vehicleVersionId: versao.id,
    imagemUrl: imagem?.url ?? versao.vehicleModel.photoUrl ?? null,
    // So ha credito quando a foto veio de uma imagem cadastrada; o
    // photoUrl do modelo e legado e nao carrega atribuicao.
    imagemCredito: imagem?.credit ?? null,
    declaradas: await obterAplicacoesDeclaradas(vehicleVersionId),
    logoMontadoraUrl: versao.vehicleModel.manufacturer.logoUrl,
    pneus,
    alternativas,
  };
}
