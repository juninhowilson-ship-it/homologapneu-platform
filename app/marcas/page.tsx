import { prisma } from '@/lib/prisma';
import { Building2 } from 'lucide-react';
import Link from 'next/link';

async function getManufacturers() {
  try {
    return await prisma.$queryRaw<
      Array<{ name: string; homog_count: bigint; model_count: bigint }>
    >`
      SELECT
        m.name,
        COUNT(DISTINCT h.id) as homog_count,
        COUNT(DISTINCT vm.id) as model_count
      FROM manufacturers m
      LEFT JOIN vehicle_models vm ON vm."manufacturerId" = m.id
      LEFT JOIN vehicle_versions vv ON vv."vehicleModelId" = vm.id
      LEFT JOIN homologations h ON h."vehicleVersionId" = vv.id
      GROUP BY m.name
      ORDER BY homog_count DESC
    `;
  } catch {
    return [];
  }
}

export default async function MarcasPage() {
  const manufacturers = await getManufacturers();

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#FFB81C] text-black px-6 py-4">
        <div className="max-w-full mx-auto flex items-center gap-3">
          <Building2 className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold">Marcas e Fabricantes</h1>
            <p className="text-sm text-black/70">Explore todas as {manufacturers.length} marcas</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-full mx-auto px-6 py-12 sm:px-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">🏭 Todas as Marcas</h2>
          <p className="text-[#888888]">Total: {manufacturers.length} fabricantes catalogados</p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {manufacturers.map(mfg => (
            <div
              key={mfg.name}
              className="group rounded-lg border border-[#333333] bg-[#1a1a1a] p-4 hover:border-[#FFB81C] hover:bg-[#FFB81C]/5 transition-all cursor-pointer"
            >
              <div className="text-3xl mb-3 font-bold text-[#FFB81C]">
                {mfg.name.charAt(0)}
              </div>
              <h3 className="font-bold text-white text-sm mb-3 group-hover:text-[#FFB81C] transition">
                {mfg.name}
              </h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#888888]">Homologações:</span>
                  <span className="text-[#FFB81C] font-bold">{Number(mfg.homog_count)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#888888]">Modelos:</span>
                  <span className="text-[#51e0a1] font-bold">{Number(mfg.model_count)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const revalidate = 3600;
