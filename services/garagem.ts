import "server-only";
import { prisma } from "@/lib/prisma";
import {
  listFavoritosDoUsuario,
  addFavorito,
  removeFavorito,
  idsFavoritosDoUsuario,
} from "@/repositories/favoritos";
import { NotFoundError } from "@/lib/errors";

export type VeiculoGaragem = {
  vehicleVersionId: number;
  fabricante: string;
  modelo: string;
  versao: string;
  anoInicial: number;
  anoFinal: number;
  motorizacao: string;
  imagemUrl: string | null;
  salvoEm: string;
};

export async function listarGaragem(userId: number): Promise<VeiculoGaragem[]> {
  const favoritos = await listFavoritosDoUsuario(userId);

  return favoritos.map((f) => {
    const v = f.vehicleVersion;
    return {
      vehicleVersionId: v.id,
      fabricante: v.vehicleModel.manufacturer.name,
      modelo: v.vehicleModel.name,
      versao: v.name,
      anoInicial: v.yearStart,
      anoFinal: v.yearEnd,
      motorizacao: v.engine.name,
      imagemUrl:
        v.images.find((img) => img.type === "PRINCIPAL")?.url ??
        v.images[0]?.url ??
        v.vehicleModel.photoUrl ??
        null,
      salvoEm: f.createdAt.toISOString(),
    };
  });
}

export async function salvarNaGaragem(userId: number, vehicleVersionId: number) {
  const versao = await prisma.vehicleVersion.findUnique({
    where: { id: vehicleVersionId },
    select: { id: true },
  });
  if (!versao) {
    throw new NotFoundError("Veículo não encontrado");
  }
  await addFavorito(userId, vehicleVersionId);
}

export async function removerDaGaragem(userId: number, vehicleVersionId: number) {
  await removeFavorito(userId, vehicleVersionId);
}

export async function idsGaragem(userId: number): Promise<number[]> {
  return idsFavoritosDoUsuario(userId);
}
