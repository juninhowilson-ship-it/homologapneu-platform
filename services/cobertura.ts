import "server-only";
import { prisma } from "@/lib/prisma";
import type { CoberturaMetrica, CoberturaNacional } from "@/types/cobertura";

function metrica(
  concluidos: number,
  total: number,
  definicao: string
): CoberturaMetrica {
  const percentual = total === 0 ? 0 : Math.round((concluidos / total) * 10000) / 100;
  return { total, concluidos, percentual, definicao };
}

async function calcularMontadoras(): Promise<CoberturaMetrica> {
  const [total, concluidos] = await Promise.all([
    prisma.manufacturer.count(),
    prisma.manufacturer.count({
      where: {
        country: { not: null },
        website: { not: null },
        logoUrl: { not: null },
        automotiveGroupId: { not: null },
      },
    }),
  ]);
  return metrica(
    concluidos,
    total,
    "Montadoras com país, site, logo e grupo automotivo preenchidos."
  );
}

async function calcularModelos(): Promise<CoberturaMetrica> {
  const [total, comVersao] = await Promise.all([
    prisma.vehicleModel.count(),
    prisma.vehicleModel.count({ where: { versions: { some: {} } } }),
  ]);
  return metrica(
    comVersao,
    total,
    "Modelos do catálogo oficial da tabela FIPE (referência nacional de veículos) que já possuem ao menos uma versão técnica documentada."
  );
}

async function calcularVersoes(): Promise<CoberturaMetrica> {
  const [total, completas] = await Promise.all([
    prisma.vehicleVersion.count(),
    prisma.vehicleVersion.count({
      where: {
        transmissionId: { not: null },
        drivetrain: { not: null },
        segment: { not: null },
        doors: { not: null },
      },
    }),
  ]);
  return metrica(
    completas,
    total,
    "Versões com transmissão, tração, segmento e número de portas preenchidos."
  );
}

async function calcularPneus(): Promise<CoberturaMetrica> {
  const [total, comHomologacao] = await Promise.all([
    prisma.tire.count(),
    prisma.tire.count({ where: { homologationTires: { some: {} } } }),
  ]);
  return metrica(
    comHomologacao,
    total,
    "Pneus cadastrados que já estão vinculados a pelo menos uma homologação real."
  );
}

async function calcularHomologacoes(): Promise<CoberturaMetrica> {
  const [total, validadas] = await Promise.all([
    prisma.homologation.count(),
    prisma.homologation.count({ where: { validationStatus: "VALIDADO" } }),
  ]);
  return metrica(
    validadas,
    total,
    "Homologações com status VALIDADO (revisadas e confirmadas)."
  );
}

async function calcularImagens(): Promise<CoberturaMetrica> {
  const [
    manufacturers,
    manufacturersComLogo,
    tireManufacturers,
    tireManufacturersComLogo,
    versoes,
    versoesComImagem,
    pneus,
    pneusComImagem,
  ] = await Promise.all([
    prisma.manufacturer.count(),
    prisma.manufacturer.count({ where: { logoUrl: { not: null } } }),
    prisma.tireManufacturer.count(),
    prisma.tireManufacturer.count({ where: { logoUrl: { not: null } } }),
    prisma.vehicleVersion.count(),
    prisma.vehicleVersion.count({ where: { images: { some: {} } } }),
    prisma.tire.count(),
    prisma.tire.count({
      where: { OR: [{ imageUrl: { not: null } }, { images: { some: {} } }] },
    }),
  ]);

  const total = manufacturers + tireManufacturers + versoes + pneus;
  const concluidos =
    manufacturersComLogo + tireManufacturersComLogo + versoesComImagem + pneusComImagem;

  return metrica(
    concluidos,
    total,
    "Entidades (montadoras, fabricantes de pneu, versões de veículo e pneus) que já possuem ao menos uma imagem real associada."
  );
}

export async function obterCoberturaNacional(): Promise<CoberturaNacional> {
  const [montadoras, modelos, versoes, pneus, homologacoes, imagens] = await Promise.all([
    calcularMontadoras(),
    calcularModelos(),
    calcularVersoes(),
    calcularPneus(),
    calcularHomologacoes(),
    calcularImagens(),
  ]);

  const coberturaBrasil: CoberturaMetrica = {
    ...modelos,
    definicao:
      "Percentual dos modelos de veículo do catálogo oficial FIPE (referência nacional) que já possuem ao menos uma versão técnica documentada nesta base — indicador principal de cobertura do Brasil.",
  };

  return {
    montadoras,
    modelos,
    versoes,
    pneus,
    homologacoes,
    imagens,
    coberturaBrasil,
    calculadoEm: new Date().toISOString(),
  };
}
