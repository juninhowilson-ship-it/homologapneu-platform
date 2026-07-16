import { NextResponse } from "next/server";
import { listarJobs, resumoFilas } from "@/services/crawlerJobQueue";
import { errorResponse } from "@/lib/api-response";
import type { CrawlerJobQueue, CrawlerJobStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queue = searchParams.get("queue") as CrawlerJobQueue | null;
    const status = searchParams.get("status") as CrawlerJobStatus | null;
    const [jobs, resumo] = await Promise.all([
      listarJobs({ queue: queue ?? undefined, status: status ?? undefined }),
      resumoFilas(),
    ]);
    return NextResponse.json({ jobs, resumo });
  } catch (error) {
    return errorResponse(error);
  }
}
