import "server-only";
import { prisma } from "@/lib/prisma";
import { ValidationError } from "@/lib/errors";
import type { MediaLinkContext } from "@/lib/media/types";
import type { NamingContext } from "@/lib/media/naming";
import type { MediaType } from "@prisma/client";

/**
 * "Criar relacionamentos automáticos" (pedido explícito): confirma que a
 * entidade referenciada (Manufacturer/VehicleVersion/Tire/Wheel/
 * Homologation) realmente existe antes de vincular uma mídia a ela — e
 * devolve os dados necessários para nomear o arquivo (lib/media/naming.ts)
 * sem quem chamou precisar buscá-los de novo.
 */
export async function resolverContextoDeVinculo(
  type: MediaType,
  link: MediaLinkContext
): Promise<NamingContext> {
  if (link.manufacturerId) {
    const manufacturer = await prisma.manufacturer.findUnique({
      where: { id: link.manufacturerId },
      select: { name: true },
    });
    if (!manufacturer) {
      throw new ValidationError(`Fabricante #${link.manufacturerId} não encontrado`);
    }
    return { type, manufacturerName: manufacturer.name };
  }

  if (link.vehicleId) {
    const vehicle = await prisma.vehicleVersion.findUnique({
      where: { id: link.vehicleId },
      select: { name: true, yearStart: true, vehicleModel: { select: { name: true } } },
    });
    if (!vehicle) {
      throw new ValidationError(`Veículo #${link.vehicleId} não encontrado`);
    }
    return {
      type,
      vehicleModelName: `${vehicle.vehicleModel.name} ${vehicle.name}`,
      vehicleYear: vehicle.yearStart,
    };
  }

  if (link.tireId) {
    const tire = await prisma.tire.findUnique({
      where: { id: link.tireId },
      select: { model: true, size: true },
    });
    if (!tire) {
      throw new ValidationError(`Pneu #${link.tireId} não encontrado`);
    }
    return { type, tireModelName: tire.model, tireSize: tire.size };
  }

  if (link.wheelId) {
    const wheel = await prisma.wheel.findUnique({
      where: { id: link.wheelId },
      select: { width: true, diameter: true, boltPattern: true },
    });
    if (!wheel) {
      throw new ValidationError(`Roda #${link.wheelId} não encontrada`);
    }
    return { type, wheelLabel: `${wheel.width}x${wheel.diameter} ${wheel.boltPattern}` };
  }

  if (link.homologationId) {
    const homologation = await prisma.homologation.findUnique({
      where: { id: link.homologationId },
      select: { code: true },
    });
    if (!homologation) {
      throw new ValidationError(`Homologação #${link.homologationId} não encontrada`);
    }
    return { type, fallback: `homologacao-${homologation.code}` };
  }

  return { type };
}
