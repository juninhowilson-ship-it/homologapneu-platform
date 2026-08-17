import "server-only";
import { prisma } from "@/lib/prisma";

export async function listFavoritosDoUsuario(userId: number) {
  return prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      vehicleVersion: {
        include: {
          vehicleModel: { include: { manufacturer: true } },
          engine: true,
          images: true,
        },
      },
    },
  });
}

export async function addFavorito(userId: number, vehicleVersionId: number) {
  return prisma.favorite.upsert({
    where: { userId_vehicleVersionId: { userId, vehicleVersionId } },
    create: { userId, vehicleVersionId },
    update: {},
  });
}

export async function removeFavorito(userId: number, vehicleVersionId: number) {
  await prisma.favorite.deleteMany({ where: { userId, vehicleVersionId } });
}

export async function idsFavoritosDoUsuario(userId: number): Promise<number[]> {
  const rows = await prisma.favorite.findMany({
    where: { userId },
    select: { vehicleVersionId: true },
  });
  return rows.map((r) => r.vehicleVersionId);
}
