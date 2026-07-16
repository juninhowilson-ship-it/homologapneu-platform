import { NextResponse } from "next/server";
import { listarFontes } from "@/services/crawlerSourceCatalog";
import { errorResponse } from "@/lib/api-response";
import type { CrawlerSourceStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as CrawlerSourceStatus | null;
    const manufacturerName = searchParams.get("manufacturerName");
    const fontes = await listarFontes({
      status: status ?? undefined,
      manufacturerName: manufacturerName ?? undefined,
    });
    return NextResponse.json({ data: fontes });
  } catch (error) {
    return errorResponse(error);
  }
}
