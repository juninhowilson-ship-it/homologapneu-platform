import "server-only";
import { prisma } from "@/lib/prisma";

export async function findCountryByIsoCode(
  isoCode: string
): Promise<{ id: number; name: string; region: string | null } | null> {
  return prisma.country.findUnique({
    where: { isoCode },
    select: { id: true, name: true, region: true },
  });
}

export async function createCountry(data: {
  isoCode: string;
  name: string;
  region: string | null;
}): Promise<{ id: number }> {
  return prisma.country.create({ data, select: { id: true } });
}

export async function updateCountry(
  id: number,
  data: { name?: string; region?: string | null }
): Promise<{ id: number }> {
  return prisma.country.update({ where: { id }, data, select: { id: true } });
}

export async function findMarketByCode(
  code: string
): Promise<{ id: number; name: string; countryId: number | null } | null> {
  return prisma.market.findUnique({
    where: { code },
    select: { id: true, name: true, countryId: true },
  });
}

export async function createMarket(data: {
  code: string;
  name: string;
  countryId: number | null;
}): Promise<{ id: number }> {
  return prisma.market.create({ data, select: { id: true } });
}

export async function updateMarket(
  id: number,
  data: { name?: string; countryId?: number | null }
): Promise<{ id: number }> {
  return prisma.market.update({ where: { id }, data, select: { id: true } });
}
