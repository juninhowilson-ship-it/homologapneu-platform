import { NextResponse } from "next/server";
import { obterConfig, definirFrequencia } from "@/services/intelligentCrawler";
import { errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const config = await obterConfig();
    return NextResponse.json(config);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const frequency = body.frequency;
    if (frequency !== "DAILY" && frequency !== "WEEKLY" && frequency !== "MANUAL") {
      return NextResponse.json({ error: "frequency inválida (use DAILY, WEEKLY ou MANUAL)" }, { status: 400 });
    }
    const config = await definirFrequencia(frequency);
    return NextResponse.json(config);
  } catch (error) {
    return errorResponse(error);
  }
}
