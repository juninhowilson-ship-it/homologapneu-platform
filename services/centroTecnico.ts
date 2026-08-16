import "server-only";
import { prisma } from "@/lib/prisma";

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
};

export type FichaTecnica = {
  vehicleVersionId: number;
  imagemUrl: string | null;
  logoMontadoraUrl: string | null;
  pneus: PneuFicha[];
  alternativas: AlternativaMedida[];
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
      images: { select: { type: true, url: true } },
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

      if (daMedida.length > 0) {
        alternativas.push({ medida, pneus: daMedida });
      }
    }
  }

  const imagem =
    versao.images.find((img) => img.type === "PRINCIPAL")?.url ??
    versao.images[0]?.url ??
    versao.vehicleModel.photoUrl ??
    null;

  return {
    vehicleVersionId: versao.id,
    imagemUrl: imagem,
    logoMontadoraUrl: versao.vehicleModel.manufacturer.logoUrl,
    pneus,
    alternativas,
  };
}
