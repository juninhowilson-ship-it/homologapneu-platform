'use client';

/**
 * TireCard - Componente de pneu otimizado
 * Exibe informações do pneu com specs e posições
 */

import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

interface TireCardProps {
  id: number;
  brand: string;
  model: string;
  size: string;
  position: string;
  role: string;
  imageUrl?: string;
  restrictions?: string;
  onClick?: () => void;
}

export function TireCard({
  id,
  brand,
  model,
  size,
  position,
  role,
  imageUrl,
  restrictions,
  onClick,
}: TireCardProps) {
  const positionLabel = position === 'AMBOS' ? 'Todos os eixos' : position;
  const roleLabel = role === 'ORIGINAL' ? 'Equipamento Original' : role;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
    >
      {/* Imagem */}
      <div className="mb-3 h-40 bg-gradient-to-br from-gray-50 to-gray-100 rounded-md flex items-center justify-center overflow-hidden dark:from-gray-800 dark:to-gray-700">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${brand} ${model}`}
            width={160}
            height={160}
            className="object-contain"
          />
        ) : (
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              {size}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sem imagem
            </p>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {brand} {model}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{size}</p>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            {positionLabel}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {roleLabel}
          </Badge>
        </div>

        {/* Restrições */}
        {restrictions && (
          <div className="rounded bg-yellow-50 p-2 dark:bg-yellow-900/20">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              ⚠️ {restrictions}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
