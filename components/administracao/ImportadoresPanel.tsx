"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import ImportWizard, { type ImportField } from "@/components/importer/ImportWizard";
import { useImportarMontadoras } from "@/hooks/useImportarMontadoras";
import { useImportarFabricantes } from "@/hooks/useImportarFabricantes";

const MONTADORAS_FIELDS: ImportField[] = [
  { key: "nome", label: "Nome", required: true },
  { key: "pais", label: "País" },
  { key: "site", label: "Site" },
  { key: "observacoes", label: "Observações" },
  { key: "status", label: "Status" },
];

const FABRICANTES_FIELDS: ImportField[] = [
  { key: "nome", label: "Nome", required: true },
  { key: "pais", label: "País", required: true },
  { key: "site", label: "Site" },
  { key: "observacoes", label: "Observações" },
  { key: "status", label: "Status" },
];

export default function ImportadoresPanel() {
  const [montadorasOpen, setMontadorasOpen] = useState(false);
  const [fabricantesOpen, setFabricantesOpen] = useState(false);
  const importarMontadoras = useImportarMontadoras();
  const importarFabricantes = useImportarFabricantes();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" onClick={() => setMontadorasOpen(true)}>
        Importar Montadoras
      </Button>

      <Button type="button" onClick={() => setFabricantesOpen(true)}>
        Importar Fabricantes de Pneus
      </Button>

      <Link
        href="/veiculos"
        className="rounded-lg bg-brand px-4 py-2 font-semibold text-brand-foreground transition hover:opacity-90"
      >
        Importar Veículos
      </Link>
      <Link
        href="/pneus"
        className="rounded-lg bg-brand px-4 py-2 font-semibold text-brand-foreground transition hover:opacity-90"
      >
        Importar Pneus
      </Link>
      <Link
        href="/homologacoes"
        className="rounded-lg bg-brand px-4 py-2 font-semibold text-brand-foreground transition hover:opacity-90"
      >
        Importar Homologações
      </Link>

      <ImportWizard
        open={montadorasOpen}
        onClose={() => setMontadorasOpen(false)}
        title="Importar Montadoras"
        fields={MONTADORAS_FIELDS}
        templateUrl="/api/manufacturers/import/template"
        onImport={importarMontadoras}
      />

      <ImportWizard
        open={fabricantesOpen}
        onClose={() => setFabricantesOpen(false)}
        title="Importar Fabricantes de Pneus"
        fields={FABRICANTES_FIELDS}
        templateUrl="/api/fabricantes/import/template"
        onImport={importarFabricantes}
      />
    </div>
  );
}
