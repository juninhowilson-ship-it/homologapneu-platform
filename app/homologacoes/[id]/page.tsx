/**
 * Homologation Detail Page
 * SSG com fallback para homogs principais
 */

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { VehicleHero } from '@/components/VehicleHero';
import { TireCard } from '@/components/TireCard';
import { Badge } from '@/components/ui/badge';

export const revalidate = 3600;

interface PageProps {
  params: {
    id: string;
  };
}

async function getHomologationDetails(id: string) {
  const homog = await prisma.homologation.findUnique({
    where: { id: parseInt(id) },
    include: {
      vehicleVersion: {
        include: {
          vehicleModel: {
            include: {
              manufacturer: true,
            },
          },
          engine: true,
        },
      },
      homologationTires: {
        include: {
          tire: true,
        },
      },
    },
  });

  return homog;
}

export async function generateStaticParams() {
  const homogs = await prisma.homologation.findMany({
    select: { id: true },
    orderBy: { createdAt: 'desc' },
    take: 100, // SSG para top 100
  });

  return homogs.map((h) => ({
    id: h.id.toString(),
  }));
}

export default async function HomologationDetailPage({ params }: PageProps) {
  const homog = await getHomologationDetails(params.id);

  if (!homog) {
    notFound();
  }

  const vehicleModel = homog.vehicleVersion.vehicleModel;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-8">
      {/* Hero */}
      <VehicleHero
        vehicleName={vehicleModel.name}
        manufacturerName={vehicleModel.manufacturer.name}
        year={`${homog.vehicleVersion.yearStart}-${homog.vehicleVersion.yearEnd}`}
        imageUrl={vehicleModel.photoUrl || undefined}
        homologationCount={1}
        validationStatus={homog.validationStatus}
      />

      {/* Main Content */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Specs */}
        <div className="lg:col-span-2 space-y-8">
          {/* Especificações do Veículo */}
          <div className="rounded-lg border border-gray-200 bg-white p-8 shadow dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
              Especificações
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Modelo
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {homog.vehicleVersion.name}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Motor
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {homog.vehicleVersion.engine?.name || 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Anos
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {homog.vehicleVersion.yearStart} - {homog.vehicleVersion.yearEnd}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Código Homologação
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
                  {homog.code}
                </p>
              </div>
            </div>
          </div>

          {/* Pneus */}
          <div className="rounded-lg border border-gray-200 bg-white p-8 shadow dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
              Pneus Homologados ({homog.homologationTires.length})
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              {homog.homologationTires.map((ht) => (
                <TireCard
                  key={ht.id}
                  id={ht.tire.id}
                  brand={ht.tire.brand}
                  model={ht.tire.model}
                  size={ht.tire.size}
                  position={ht.position}
                  role={ht.role}
                  imageUrl={ht.tire.imageUrl || undefined}
                  restrictions={ht.restrictions || undefined}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Validação
                </span>
                <Badge
                  variant={
                    homog.validationStatus === 'VALIDADA'
                      ? 'default'
                      : 'destructive'
                  }
                >
                  {homog.validationStatus === 'VALIDADA' ? '✅ Validado' : '⏳ Pendente'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Ano
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {homog.year}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Confiança
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {homog.confidence || 'N/A'}%
                </span>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
            <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition mb-3">
              📄 Baixar Ficha
            </button>
            <button className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              🔗 Compartilhar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
