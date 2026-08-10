/**
 * API otimizada para homologações com ISR + query batching
 * Revalidate: 1 hora
 * Cache: 24h stale-while-revalidate
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 3600; // ISR: 1 hora
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get("modelId");
    const manufacturerId = searchParams.get("manufacturerId");

    if (!modelId && !manufacturerId) {
      return NextResponse.json(
        { error: "Forneça modelId ou manufacturerId" },
        { status: 400 }
      );
    }

    // Query otimizada: sem N+1, com select específico
    const homologations = await prisma.homologation.findMany({
      where: {
        vehicleVersion: modelId
          ? { vehicleModelId: parseInt(modelId) }
          : {
              vehicleModel: {
                manufacturerId: parseInt(manufacturerId || "0"),
              },
            },
      },
      select: {
        id: true,
        code: true,
        year: true,
        validationStatus: true,
        tires: {
          take: 1, // Apenas 1 pneu por homog
          select: {
            tire: {
              select: {
                id: true,
                model: true,
                size: true,
                brand: true,
              },
            },
          },
        },
        vehicleVersion: {
          select: {
            id: true,
            name: true,
            vehicleModel: {
              select: {
                id: true,
                name: true,
                manufacturer: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
      take: 1000, // Limit para segurança
    });

    return NextResponse.json(homologations, {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=86400",
        "CDN-Cache-Control": "max-age=86400",
      },
    });
  } catch (error) {
    console.error("Erro ao buscar homologações:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
