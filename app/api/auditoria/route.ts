import { NextResponse } from "next/server";
import { executarAuditoria } from "@/services/auditoria";

export async function POST() {
  const findings = await executarAuditoria();
  return NextResponse.json({ findings, total: findings.length });
}
