import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Mescla VehicleModel duplicados por diferença de maiúsculas/minúsculas
 * (ex.: "City" vs "CITY") — bug genérico do normalizador FIPE anterior a
 * esta correção (scripts/lib/fipeCatalog.ts agora busca case-insensitive),
 * não específico de nenhuma montadora. Reaproveitável para qualquer
 * fabricante que já tenha esse tipo de duplicata.
 *
 * Regra de escolha do canônico (nunca inventa, só usa o próprio dado):
 * o modelo com mais VehicleVersion vinculadas vence; empate -> menor id
 * (o primeiro criado). O outro tem suas versões movidas para o canônico e
 * é soft-deleted (nunca apagado).
 */
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const manufacturerFilter = process.argv[2];

  const manufacturers = manufacturerFilter
    ? [await prisma.manufacturer.findFirstOrThrow({ where: { name: { equals: manufacturerFilter, mode: "insensitive" } } })]
    : await prisma.manufacturer.findMany({ where: { deletedAt: null } });

  let gruposMesclados = 0;
  let versoesMovidas = 0;
  let modelosSoftDeleted = 0;

  for (const manufacturer of manufacturers) {
    const modelos = await prisma.vehicleModel.findMany({
      where: { manufacturerId: manufacturer.id, deletedAt: null },
      include: { _count: { select: { versions: true } } },
    });

    const grupos = new Map<string, typeof modelos>();
    for (const m of modelos) {
      const key = m.name.toLowerCase();
      grupos.set(key, [...(grupos.get(key) ?? []), m]);
    }

    for (const [key, grupo] of grupos) {
      if (grupo.length <= 1) continue;

      const ordenado = [...grupo].sort((a, b) => {
        if (b._count.versions !== a._count.versions) return b._count.versions - a._count.versions;
        return a.id - b.id;
      });
      const [canonico, ...duplicatas] = ordenado;

      console.log(`[${manufacturer.name}] grupo "${key}": canônico="${canonico.name}" (id ${canonico.id}, ${canonico._count.versions} versões) <- duplicatas: ${duplicatas.map((d) => `"${d.name}" (id ${d.id}, ${d._count.versions}v)`).join(", ")}`);

      for (const dup of duplicatas) {
        const moved = await prisma.vehicleVersion.updateMany({
          where: { vehicleModelId: dup.id },
          data: { vehicleModelId: canonico.id },
        });
        versoesMovidas += moved.count;

        await prisma.vehicleModel.update({
          where: { id: dup.id },
          data: {
            deletedAt: new Date(),
            notes: `Mesclado em ${new Date().toISOString().slice(0, 10)}: duplicata por diferença de maiúsculas/minúsculas de "${canonico.name}" (id ${canonico.id}). ${moved.count} versão(ões) movida(s) para o canônico. Registro original preservado (soft delete), nunca apagado.`,
          },
        });
        modelosSoftDeleted++;

        await prisma.auditLog.create({
          data: {
            entity: "VehicleModel",
            entityId: dup.id,
            action: "UPDATE",
            changes: JSON.stringify({ acao: "merge-duplicata-case-insensitive", canonicoId: canonico.id, versoesMovidas: moved.count }),
          },
        });
      }
      gruposMesclados++;
    }
  }

  console.log(`\n=== Resumo: ${gruposMesclados} grupo(s) mesclado(s), ${versoesMovidas} versão(ões) movida(s), ${modelosSoftDeleted} modelo(s) soft-deleted. ===`);
}

main()
  .catch((e) => { console.error("Falha:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
