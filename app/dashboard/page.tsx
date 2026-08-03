/**
 * Dashboard Page - Página principal com estatísticas
 * ISR: Revalidado a cada 1 hora
 */

import { prisma } from '@/lib/prisma';
import { VehicleHero } from '@/components/VehicleHero';
import { StatCard } from '@/components/StatCard';
import { getWithCache } from '@/lib/cache-service';
import { CACHE_TTL, CACHE_KEYS } from '@/lib/cache-service';

export const dynamic = 'force-static';
export const revalidate = 3600; // ISR: 1 hora

async function getStats() {
  return getWithCache(
    CACHE_KEYS.STATS + 'dashboard',
    async () => {
      const [
        totalHomogs,
        totalModels,
        totalManufacturers,
        totalTires,
        validatedCount,
      ] = await Promise.all([
        prisma.homologation.count(),
        prisma.vehicleModel.count(),
        prisma.manufacturer.count(),
        prisma.tire.count(),
        prisma.homologation.count({
          where: { validationStatus: 'VALIDADA' },
        }),
      ]);

      return {
        totalHomogs,
        totalModels,
        totalManufacturers,
        totalTires,
        validatedCount,
        validationRate: Math.round((validatedCount / totalHomogs) * 100),
      };
    },
    CACHE_TTL.MEDIUM
  );
}

async function getTopManufacturers() {
  return getWithCache(
    CACHE_KEYS.MANUFACTURERS + 'top',
    async () => {
      const result = await prisma.$queryRaw<
        Array<{
          id: number;
          name: string;
          homog_count: number;
          model_count: number;
        }>
      >`
        SELECT
          m.id,
          m.name,
          COUNT(DISTINCT h.id) as homog_count,
          COUNT(DISTINCT vm.id) as model_count
        FROM manufacturers m
        LEFT JOIN vehicle_models vm ON vm."manufacturerId" = m.id
        LEFT JOIN vehicle_versions vv ON vv."vehicleModelId" = vm.id
        LEFT JOIN homologations h ON h."vehicleVersionId" = vv.id
        GROUP BY m.id, m.name
        ORDER BY homog_count DESC
        LIMIT 10
      `;
      return result;
    },
    CACHE_TTL.LONG
  );
}

export default async function DashboardPage() {
  const [stats, topManufacturers] = await Promise.all([
    getStats(),
    getTopManufacturers(),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-8">
      {/* Hero */}
      <VehicleHero
        vehicleName="HomologaPneu"
        manufacturerName="Dashboard"
        year={new Date().getFullYear().toString()}
        homologationCount={stats.totalHomogs}
        validationStatus="VALIDADA"
      />

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
        <StatCard
          label="Homologações"
          value={stats.totalHomogs}
          color="blue"
        />
        <StatCard
          label="Modelos"
          value={stats.totalModels}
          color="green"
        />
        <StatCard
          label="Fabricantes"
          value={stats.totalManufacturers}
          color="orange"
        />
        <StatCard
          label="Pneus"
          value={stats.totalTires}
          color="red"
        />
        <StatCard
          label="Taxa Validação"
          value={`${stats.validationRate}%`}
          color="blue"
        />
      </div>

      {/* Top Manufacturers */}
      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Top 10 Fabricantes
        </h2>
        <div className="space-y-4">
          {topManufacturers.map((mfg) => (
            <div
              key={mfg.id}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {mfg.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {mfg.model_count} modelos
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {Number(mfg.homog_count)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  homologações
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
