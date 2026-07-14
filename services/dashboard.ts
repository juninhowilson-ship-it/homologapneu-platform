import "server-only";
import { prisma } from "@/lib/prisma";
import { obterCoberturaNacional } from "@/services/cobertura";
import type {
  DashboardData,
  RankingItem,
  UltimoAcesso,
} from "@/types/dashboard";

async function calcularUltimaAtualizacao(): Promise<string | null> {
  const [veiculo, pneu, homologacao, fabricante] = await Promise.all([
    prisma.vehicleVersion.aggregate({ _max: { updatedAt: true } }),
    prisma.tire.aggregate({ _max: { updatedAt: true } }),
    prisma.homologation.aggregate({ _max: { updatedAt: true } }),
    prisma.tireManufacturer.aggregate({ _max: { updatedAt: true } }),
  ]);

  const datas = [
    veiculo._max.updatedAt,
    pneu._max.updatedAt,
    homologacao._max.updatedAt,
    fabricante._max.updatedAt,
  ].filter((data): data is Date => data !== null);

  if (datas.length === 0) return null;

  return new Date(Math.max(...datas.map((data) => data.getTime()))).toISOString();
}

async function calcularImagensTotais(): Promise<number> {
  const [
    manufacturersComLogo,
    tireManufacturersComLogo,
    versoesComImagem,
    pneusComImagem,
  ] = await Promise.all([
    prisma.manufacturer.count({ where: { logoUrl: { not: null } } }),
    prisma.tireManufacturer.count({ where: { logoUrl: { not: null } } }),
    prisma.vehicleImage.count(),
    prisma.tire.count({
      where: { OR: [{ imageUrl: { not: null } }, { images: { some: {} } }] },
    }),
  ]);
  return manufacturersComLogo + tireManufacturersComLogo + versoesComImagem + pneusComImagem;
}

async function calcularRegistrosImportados(): Promise<number> {
  const resultado = await prisma.importBatch.aggregate({
    _sum: { importedCount: true },
  });
  return resultado._sum.importedCount ?? 0;
}

async function calcularKpis() {
  const [
    fabricantes,
    marcas,
    modelos,
    veiculos,
    pneus,
    homologacoes,
    medidas,
    imagens,
    registrosImportados,
    cobertura,
    ultimaAtualizacao,
  ] = await Promise.all([
    prisma.tireManufacturer.count(),
    prisma.manufacturer.count(),
    prisma.vehicleModel.count(),
    prisma.vehicleVersion.count(),
    prisma.tire.count(),
    prisma.homologation.count(),
    prisma.tire.findMany({ select: { size: true }, distinct: ["size"] }),
    calcularImagensTotais(),
    calcularRegistrosImportados(),
    obterCoberturaNacional(),
    calcularUltimaAtualizacao(),
  ]);

  return {
    fabricantes,
    marcas,
    modelos,
    veiculos,
    pneus,
    homologacoes,
    medidas: medidas.length,
    imagens,
    registrosImportados,
    coberturaBrasil: cobertura.coberturaBrasil.percentual,
    ultimaAtualizacao,
  };
}

async function calcularHomologacoesPorFabricante(): Promise<RankingItem[]> {
  const registros = await prisma.homologation.findMany({
    select: {
      vehicleVersion: {
        select: { vehicleModel: { select: { manufacturer: { select: { name: true } } } } },
      },
    },
  });

  const contagem = new Map<string, number>();
  for (const registro of registros) {
    const nome = registro.vehicleVersion.vehicleModel.manufacturer.name;
    contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
  }

  return Array.from(contagem, ([name, value]) => ({ name, value })).sort(
    (a, b) => b.value - a.value
  );
}

async function calcularTopFabricantesVeiculos(): Promise<RankingItem[]> {
  const versoes = await prisma.vehicleVersion.findMany({
    select: {
      vehicleModel: { select: { manufacturer: { select: { name: true } } } },
    },
  });

  const contagem = new Map<string, number>();
  for (const versao of versoes) {
    const nome = versao.vehicleModel.manufacturer.name;
    contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
  }

  return Array.from(contagem, ([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

async function calcularTopFabricantesPneus(): Promise<RankingItem[]> {
  const grupos = await prisma.tire.groupBy({
    by: ["tireManufacturerId"],
    _count: { tireManufacturerId: true },
    orderBy: { _count: { tireManufacturerId: "desc" } },
    take: 8,
  });

  const fabricantesInfo = await prisma.tireManufacturer.findMany({
    where: { id: { in: grupos.map((g) => g.tireManufacturerId) } },
    select: { id: true, name: true },
  });
  const nomes = new Map(fabricantesInfo.map((f) => [f.id, f.name]));

  return grupos.map((grupo) => ({
    name: nomes.get(grupo.tireManufacturerId) ?? "Desconhecido",
    value: grupo._count.tireManufacturerId,
  }));
}

async function calcularMedidasMaisHomologadas(): Promise<RankingItem[]> {
  const registros = await prisma.homologationTire.findMany({
    select: { tire: { select: { size: true } } },
  });

  const contagem = new Map<string, number>();
  for (const registro of registros) {
    contagem.set(registro.tire.size, (contagem.get(registro.tire.size) ?? 0) + 1);
  }

  return Array.from(contagem, ([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

async function calcularArosMaisUtilizados(): Promise<RankingItem[]> {
  const grupos = await prisma.tire.groupBy({
    by: ["rim"],
    _count: { rim: true },
    orderBy: { _count: { rim: "desc" } },
    take: 8,
  });

  return grupos.map((grupo) => ({
    name: `Aro ${grupo.rim}`,
    value: grupo._count.rim,
  }));
}

async function calcularHomologacoesMaisUtilizadas(): Promise<RankingItem[]> {
  const grupos = await prisma.homologation.groupBy({
    by: ["code"],
    _count: { code: true },
    orderBy: { _count: { code: "desc" } },
    take: 8,
  });

  return grupos.map((grupo) => ({
    name: grupo.code,
    value: grupo._count.code,
  }));
}

async function calcularVeiculosComMaisHomologacoes(): Promise<RankingItem[]> {
  const veiculos = await prisma.vehicleVersion.findMany({
    select: {
      name: true,
      vehicleModel: {
        select: { name: true, manufacturer: { select: { name: true } } },
      },
      _count: { select: { homologations: true } },
    },
    orderBy: { homologations: { _count: "desc" } },
    take: 8,
  });

  return veiculos
    .filter((veiculo) => veiculo._count.homologations > 0)
    .map((veiculo) => ({
      name: `${veiculo.vehicleModel.manufacturer.name} ${veiculo.vehicleModel.name} ${veiculo.name}`,
      value: veiculo._count.homologations,
    }));
}

async function calcularDistribuicaoCategoria(): Promise<RankingItem[]> {
  const grupos = await prisma.vehicleVersion.groupBy({
    by: ["category"],
    _count: { category: true },
  });

  return grupos
    .map((grupo) => ({ name: grupo.category, value: grupo._count.category }))
    .sort((a, b) => b.value - a.value);
}

async function calcularDistribuicaoSegmento(): Promise<RankingItem[]> {
  const grupos = await prisma.vehicleVersion.groupBy({
    by: ["segment"],
    _count: { segment: true },
  });

  return grupos
    .filter((grupo) => grupo.segment !== null)
    .map((grupo) => ({ name: grupo.segment as string, value: grupo._count.segment }))
    .sort((a, b) => b.value - a.value);
}

async function calcularDistribuicaoCombustivel(): Promise<RankingItem[]> {
  const versoes = await prisma.vehicleVersion.findMany({
    select: { engine: { select: { fuel: true } } },
  });

  const contagem = new Map<string, number>();
  for (const versao of versoes) {
    const fuel = versao.engine.fuel;
    contagem.set(fuel, (contagem.get(fuel) ?? 0) + 1);
  }

  return Array.from(contagem, ([name, value]) => ({ name, value })).sort(
    (a, b) => b.value - a.value
  );
}

async function calcularPesquisasMaisRealizadas(): Promise<RankingItem[]> {
  const grupos = await prisma.searchLog.groupBy({
    by: ["resumo"],
    _count: { resumo: true },
    orderBy: { _count: { resumo: "desc" } },
    take: 8,
  });

  return grupos.map((grupo) => ({
    name: grupo.resumo,
    value: grupo._count.resumo,
  }));
}

async function calcularVeiculosMaisPesquisados(): Promise<RankingItem[]> {
  const grupos = await prisma.searchLog.groupBy({
    by: ["veiculoBusca"],
    where: { veiculoBusca: { not: null } },
    _count: { veiculoBusca: true },
    orderBy: { _count: { veiculoBusca: "desc" } },
    take: 8,
  });

  return grupos.map((grupo) => ({
    name: grupo.veiculoBusca ?? "—",
    value: grupo._count.veiculoBusca,
  }));
}

async function calcularPneusMaisPesquisados(): Promise<RankingItem[]> {
  const grupos = await prisma.searchLog.groupBy({
    by: ["pneuBusca"],
    where: { pneuBusca: { not: null } },
    _count: { pneuBusca: true },
    orderBy: { _count: { pneuBusca: "desc" } },
    take: 8,
  });

  return grupos.map((grupo) => ({
    name: grupo.pneuBusca ?? "—",
    value: grupo._count.pneuBusca,
  }));
}

async function calcularUltimosAcessos(): Promise<UltimoAcesso[]> {
  const registros = await prisma.searchLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, resumo: true, resultCount: true, createdAt: true },
  });

  return registros.map((registro) => ({
    id: registro.id,
    resumo: registro.resumo,
    resultCount: registro.resultCount,
    createdAt: registro.createdAt.toISOString(),
  }));
}

export async function obterDashboard(): Promise<DashboardData> {
  const [
    kpis,
    homologacoesPorFabricante,
    topFabricantesVeiculos,
    topFabricantesPneus,
    medidasMaisHomologadas,
    arosMaisUtilizados,
    homologacoesMaisUtilizadas,
    veiculosComMaisHomologacoes,
    distribuicaoCategoria,
    distribuicaoSegmento,
    distribuicaoCombustivel,
    pesquisasMaisRealizadas,
    veiculosMaisPesquisados,
    pneusMaisPesquisados,
    ultimosAcessos,
  ] = await Promise.all([
    calcularKpis(),
    calcularHomologacoesPorFabricante(),
    calcularTopFabricantesVeiculos(),
    calcularTopFabricantesPneus(),
    calcularMedidasMaisHomologadas(),
    calcularArosMaisUtilizados(),
    calcularHomologacoesMaisUtilizadas(),
    calcularVeiculosComMaisHomologacoes(),
    calcularDistribuicaoCategoria(),
    calcularDistribuicaoSegmento(),
    calcularDistribuicaoCombustivel(),
    calcularPesquisasMaisRealizadas(),
    calcularVeiculosMaisPesquisados(),
    calcularPneusMaisPesquisados(),
    calcularUltimosAcessos(),
  ]);

  return {
    kpis,
    mercado: {
      homologacoesPorFabricante,
      topFabricantesVeiculos,
      topFabricantesPneus,
      medidasMaisHomologadas,
      arosMaisUtilizados,
      homologacoesMaisUtilizadas,
      veiculosComMaisHomologacoes,
      distribuicaoCategoria,
      distribuicaoSegmento,
      distribuicaoCombustivel,
    },
    pesquisas: {
      pesquisasMaisRealizadas,
      veiculosMaisPesquisados,
      pneusMaisPesquisados,
      ultimosAcessos,
    },
  };
}
