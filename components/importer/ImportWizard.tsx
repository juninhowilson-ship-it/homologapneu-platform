"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import type { ImportacaoResultado } from "@/types/importacao";

export type ImportField = {
  key: string;
  label: string;
  required?: boolean;
};

type ParsedFile = {
  headers: string[];
  rows: Record<string, string>[];
};

type Step = "upload" | "mapping" | "result";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: ImportField[];
  templateUrl?: string;
  onImport: (
    rows: Record<string, string>[],
    fileName: string
  ) => Promise<ImportacaoResultado>;
};

function suggestMapping(
  headers: string[],
  fields: ImportField[]
): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const field of fields) {
    const match = headers.find((header) => {
      const normalized = header.trim().toLowerCase();
      return (
        normalized === field.key.toLowerCase() ||
        normalized === field.label.toLowerCase()
      );
    });
    if (match) mapping[field.key] = match;
  }

  return mapping;
}

function mapRow(
  row: Record<string, string>,
  mapping: Record<string, string>,
  fields: ImportField[]
): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const field of fields) {
    const sourceHeader = mapping[field.key];
    mapped[field.key] = sourceHeader ? (row[sourceHeader] ?? "") : "";
  }
  return mapped;
}

export default function ImportWizard({
  open,
  onClose,
  title,
  fields,
  templateUrl,
  onImport,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportacaoResultado | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function reset() {
    setStep("upload");
    setParsing(false);
    setParseError(null);
    setParsed(null);
    setFileName("");
    setMapping({});
    setImporting(false);
    setResult(null);
    setImportError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setParsing(true);
    setParseError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/importer/parse", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setParseError(data.error ?? "Não foi possível ler o arquivo.");
        return;
      }

      setParsed(data);
      setFileName(file.name);
      setMapping(suggestMapping(data.headers, fields));
      setStep("mapping");
    } catch {
      setParseError("Não foi possível ler o arquivo.");
    } finally {
      setParsing(false);
    }
  }

  const previewRows = useMemo(() => {
    if (!parsed) return [];
    return parsed.rows.slice(0, 8).map((row) => mapRow(row, mapping, fields));
  }, [parsed, mapping, fields]);

  const requiredFieldsMapped = fields
    .filter((field) => field.required)
    .every((field) => Boolean(mapping[field.key]));

  async function handleConfirmImport() {
    if (!parsed) return;

    setImporting(true);
    setImportError(null);

    try {
      const mappedRows = parsed.rows.map((row) => mapRow(row, mapping, fields));
      const resultado = await onImport(mappedRows, fileName);
      setResult(resultado);
      setStep("result");
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Não foi possível importar o arquivo."
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} title={title} size="lg">
      <div className="space-y-4">
        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Envie um arquivo CSV, Excel (XLSX), ODS, JSON ou XML. Na
              próxima etapa você poderá conferir e ajustar o mapeamento das
              colunas antes de importar.
            </p>

            {templateUrl && (
              <Link href={templateUrl} className="text-brand underline">
                Baixar modelo de planilha
              </Link>
            )}

            <div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.ods,.json,.xml,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={parsing}
                onClick={() => inputRef.current?.click()}
              >
                {parsing ? "Lendo arquivo..." : "Selecionar arquivo"}
              </Button>
            </div>

            {parseError && (
              <p className="text-sm text-red-600">{parseError}</p>
            )}
          </div>
        )}

        {step === "mapping" && parsed && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {parsed.rows.length} linha(s) encontrada(s). Confirme o
              mapeamento das colunas do arquivo para os campos do sistema.
            </p>

            <div className="grid max-h-64 grid-cols-1 gap-4 overflow-y-auto pr-2 md:grid-cols-2">
              {fields.map((field) => (
                <Select
                  key={field.key}
                  label={`${field.label}${field.required ? " *" : ""}`}
                  options={parsed.headers}
                  value={mapping[field.key] ?? ""}
                  onChange={(event) =>
                    setMapping((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                />
              ))}
            </div>

            <div>
              <p className="mb-2 font-semibold">Pré-visualização</p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-muted">
                    <tr>
                      {fields.map((field) => (
                        <th key={field.key} className="px-3 py-2 font-semibold">
                          {field.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewRows.map((row, index) => (
                      <tr key={index}>
                        {fields.map((field) => (
                          <td key={field.key} className="px-3 py-2">
                            {row[field.key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {!requiredFieldsMapped && (
              <p className="text-sm text-red-600">
                Mapeie todos os campos obrigatórios (*) antes de importar.
              </p>
            )}

            {importError && (
              <p className="text-sm text-red-600">{importError}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep("upload")}
                disabled={importing}
              >
                Voltar
              </Button>

              <Button
                type="button"
                disabled={importing || !requiredFieldsMapped}
                onClick={handleConfirmImport}
              >
                {importing
                  ? "Importando..."
                  : `Importar ${parsed.rows.length} linha(s)`}
              </Button>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4">
            <p className="font-semibold">
              {result.sucesso} de {result.total} linha(s) processada(s) com
              sucesso
              {result.falhas > 0 && ` • ${result.falhas} falha(s)`}
            </p>

            <div className="flex flex-wrap gap-2 text-sm">
              <Badge tone="success">{result.criados} criado(s)</Badge>
              <Badge tone="neutral">{result.atualizados} atualizado(s)</Badge>
              <Badge tone="warning">{result.duplicados} sem alteração</Badge>
              {result.falhas > 0 && (
                <Badge tone="danger">{result.falhas} com erro</Badge>
              )}
            </div>

            {result.falhas > 0 && (
              <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
                {result.detalhes
                  .filter((linha) => !linha.sucesso)
                  .map((linha) => (
                    <div
                      key={linha.linha}
                      className="flex items-start gap-3 border-b border-border p-3 last:border-b-0"
                    >
                      <Badge tone="danger">Linha {linha.linha}</Badge>
                      <div className="text-sm">
                        {linha.rotulo && (
                          <p className="font-semibold">{linha.rotulo}</p>
                        )}
                        <p className="text-muted-foreground">{linha.erro}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
