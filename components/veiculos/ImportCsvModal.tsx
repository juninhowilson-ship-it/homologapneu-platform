"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useImportarVeiculosCsv } from "@/hooks/useImportarVeiculosCsv";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ImportCsvModal({ open, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const importar = useImportarVeiculosCsv();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    importar.mutate(file);
  }

  function handleClose() {
    setFileName(null);
    importar.reset();
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Importar Veículos via CSV">
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Envie um arquivo CSV com as colunas marca, modelo, versao,
          anoInicial, anoFinal, motorizacao, potencia, combustivel,
          categoria, segmento, pais, observacoes e status.
        </p>

        <Link
          href="/api/veiculos/import/template"
          className="text-brand underline"
        >
          Baixar modelo de planilha CSV
        </Link>

        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />

          <Button
            type="button"
            variant="secondary"
            disabled={importar.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {importar.isPending ? "Importando..." : "Selecionar arquivo CSV"}
          </Button>

          {fileName && (
            <span className="ml-3 text-sm text-muted-foreground">
              {fileName}
            </span>
          )}
        </div>

        {importar.data && (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="font-semibold">
              {importar.data.sucesso} de {importar.data.total} veículo(s)
              importado(s) com sucesso
              {importar.data.falhas > 0 &&
                ` • ${importar.data.falhas} falha(s)`}
            </p>

            {importar.data.falhas > 0 && (
              <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
                {importar.data.detalhes
                  .filter((linha) => !linha.sucesso)
                  .map((linha) => (
                    <div
                      key={linha.linha}
                      className="flex items-start gap-3 border-b border-border p-3 last:border-b-0"
                    >
                      <Badge tone="danger">Linha {linha.linha}</Badge>
                      <div className="text-sm">
                        {linha.veiculo && (
                          <p className="font-semibold">{linha.veiculo}</p>
                        )}
                        <p className="text-muted-foreground">{linha.erro}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
