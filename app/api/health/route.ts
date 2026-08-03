import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

/**
 * Health check endpoint
 * GET /api/health
 *
 * Verifica:
 * - Status da aplicação
 * - Conexão com banco de dados
 * - Tempo de resposta
 * - Uptime
 *
 * Resposta: 200 (OK) ou 503 (Service Unavailable)
 */

const startTime = Date.now();

interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: "ok" | "error";
      responseTime: number;
      error?: string;
    };
    memory: {
      status: "ok" | "warning";
      heapUsedPercent: number;
      heapUsedMB: number;
      externalMB: number;
    };
  };
  buildTime?: string;
}

export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  const timestamp = new Date().toISOString();
  const uptime = Date.now() - startTime;

  try {
    // Verificar conexão com banco de dados
    const dbStartTime = Date.now();
    const dbResult = await db.$queryRaw`SELECT 1`;
    const dbResponseTime = Date.now() - dbStartTime;

    if (!dbResult) {
      throw new Error("Database query returned empty result");
    }

    // Verificar uso de memória
    const memUsage = process.memoryUsage();
    const heapLimit = Math.max(
      128, // Mínimo 128MB
      Math.floor(process.memoryUsage().heapTotal / 1024 / 1024)
    );
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const heapUsedMB = Math.floor(memUsage.heapUsed / 1024 / 1024);
    const externalMB = Math.floor(memUsage.external / 1024 / 1024);

    // Determinar status baseado em métricas
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (dbResponseTime > 1000) {
      status = "degraded";
    }
    if (heapUsedPercent > 85) {
      status = "degraded";
    }

    const response: HealthCheckResponse = {
      status,
      timestamp,
      uptime,
      checks: {
        database: {
          status: "ok",
          responseTime: dbResponseTime,
        },
        memory: {
          status: heapUsedPercent > 80 ? "warning" : "ok",
          heapUsedPercent: Math.round(heapUsedPercent * 100) / 100,
          heapUsedMB,
          externalMB,
        },
      },
      buildTime: process.env.BUILD_TIME,
    };

    return NextResponse.json(response, {
      status: status === "unhealthy" ? 503 : 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        message: "Health check failed",
        error: errorMessage,
      })
    );

    const response: HealthCheckResponse = {
      status: "unhealthy",
      timestamp,
      uptime,
      checks: {
        database: {
          status: "error",
          responseTime: -1,
          error: errorMessage,
        },
        memory: {
          status: "warning",
          heapUsedPercent: 0,
          heapUsedMB: 0,
          externalMB: 0,
        },
      },
    };

    return NextResponse.json(response, {
      status: 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Retry-After": "30",
      },
    });
  }
}

/**
 * Configurar verificação de health check periódica
 * Para usar em produção com Kubernetes/Docker
 */
export const runtime = "nodejs";
export const maxDuration = 10; // Timeout de 10 segundos
