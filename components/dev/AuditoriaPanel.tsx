"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type { AuditFinding } from "@/services/auditoria";

export default function AuditoriaPanel() {
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState<AuditFinding[] | null>(null);
  const [executadaEm, setExecutadaEm] = useState<string | null>(null);

  async function executarAuditoria() {
    setExecutando(true);
    try {
      const response = await fetch("/api/auditoria", { method: "POST" });
      const data = await response.json();
      setResultado(data.findings);
      setExecutadaEm(new Date().toLocaleString("pt-BR"));
    } finally {
      setExecutando(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Auditoria de integridade</h2>
          <p className="text-sm text-muted-foreground">
            Verifica medidas incorretas, pneus incompatíveis, homologações
            inconsistentes, versões duplicadas e dados órfãos — corrige
            automaticamente o que for seguro corrigir.
          </p>
        </div>

        <Button type="button" onClick={executarAuditoria} disabled={executando}>
          {executando ? "Executando..." : "Executar auditoria agora"}
        </Button>
      </div>

      {resultado !== null && (
        <div className="mt-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Última execução: {executadaEm} — {resultado.length} achado(s)
          </p>

          {resultado.length === 0 ? (
            <Badge tone="success">Nenhuma inconsistência encontrada</Badge>
          ) : (
            <ul className="space-y-2">
              {resultado.map((finding, index) => (
                <li
                  key={index}
                  className="rounded-lg border border-border p-3 text-sm"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Badge tone={finding.severidade === "erro" ? "danger" : "warning"}>
                      {finding.categoria}
                    </Badge>
                    {finding.corrigidoAutomaticamente && (
                      <Badge tone="success">Corrigido automaticamente</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">{finding.descricao}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
