'use client';

/**
 * VehicleHero - Hero section para página de veículo
 */

import Image from 'next/image';
import Badge from '@/components/ui/Badge';

interface VehicleHeroProps {
  vehicleName: string;
  manufacturerName: string;
  year: string;
  imageUrl?: string;
  homologationCount: number;
  validationStatus: string;
}

export function VehicleHero({
  vehicleName,
  manufacturerName,
  year,
  imageUrl,
  homologationCount,
  validationStatus,
}: VehicleHeroProps) {
  const statusLabel = validationStatus === 'NECESSITA_VALIDACAO' ? '⏳ Pendente' : '✅ Validado';
  const statusColor = validationStatus === 'NECESSITA_VALIDACAO' ? 'yellow' : 'green';

  return (
    <div className="relative mb-8 overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-lg dark:from-blue-900 dark:to-blue-950">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm opacity-90">
        <span>{manufacturerName}</span>
        <span>›</span>
        <span className="font-semibold">{vehicleName}</span>
      </div>

      {/* Layout Grid */}
      <div className="grid gap-8 md:grid-cols-2 items-center">
        {/* Imagem */}
        <div className="relative h-64 md:h-80 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={vehicleName}
              width={300}
              height={300}
              className="object-contain"
            />
          ) : (
            <div className="text-center">
              <p className="text-lg font-semibold opacity-75">Sem imagem</p>
              <p className="text-sm opacity-60">Adicione uma foto do veículo</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">{vehicleName}</h1>
            <p className="text-lg opacity-90">{manufacturerName}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-white/10 p-4">
              <p className="text-sm opacity-75">Anos</p>
              <p className="text-2xl font-bold">{year}</p>
            </div>
            <div className="rounded-lg bg-white/10 p-4">
              <p className="text-sm opacity-75">Homologações</p>
              <p className="text-2xl font-bold">{homologationCount}</p>
            </div>
          </div>

          {/* Status Badge */}
          <Badge
            tone={statusColor === 'green' ? 'success' : 'danger'}
            className="w-fit text-base"
          >
            {statusLabel}
          </Badge>
        </div>
      </div>
    </div>
  );
}
