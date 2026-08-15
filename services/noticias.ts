import "server-only";
import { prisma } from "@/lib/prisma";

export type ItemNoticia = {
  tipo: "HOMOLOGACAO" | "DOCUMENTO";
  titulo: string;
  descricao: string;
  data: string;
  link: string | null;
};

/**
 * Feed "Notícias" alimentado por dados reais da base (novas homologações
 * publicadas e novos documentos oficiais vinculados) — sem conteúdo
 * editorial fabricado. Quando as tabelas recalls/technical_bulletins
 * ganharem ingestão, entram aqui como novas categorias.
 */
export async function listarNoticias(): Promise<ItemNoticia[]> {
  const [homologacoes, documentos] = await Promise.all([
    prisma.homologation.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        vehicleVersion: {
          include: { vehicleModel: { include: { manufacturer: true } } },
        },
      },
    }),
    prisma.homologationDocument.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const itens: ItemNoticia[] = [
    ...homologacoes.map((h) => {
      const vm = h.vehicleVersion.vehicleModel;
      return {
        tipo: "HOMOLOGACAO" as const,
        titulo: `Nova homologação: ${vm.manufacturer.name} ${vm.name} ${h.vehicleVersion.name}`,
        descricao: `Código ${h.code} · ano ${h.year}`,
        data: h.createdAt.toISOString(),
        link: `/veiculo/${h.vehicleVersionId}`,
      };
    }),
    ...documentos.map((d) => ({
      tipo: "DOCUMENTO" as const,
      titulo: `Novo documento oficial: ${d.name}`,
      descricao: d.manufacturerName
        ? `Fonte: ${d.manufacturerName}`
        : "Documento de homologação",
      data: d.createdAt.toISOString(),
      link: d.url,
    })),
  ];

  return itens
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .slice(0, 20);
}
