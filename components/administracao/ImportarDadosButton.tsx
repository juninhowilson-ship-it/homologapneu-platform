"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Select from "@/components/ui/Select";
import ImportWizard, { type ImportField } from "@/components/importer/ImportWizard";
import { useImportarDados } from "@/hooks/useImportarDados";
import {
  FOLDER_KEYS,
  FOLDER_LABELS,
  type FolderKey,
} from "@/lib/constants/databaseImport";

/**
 * Colunas de cada pasta de database/import/ — espelham exatamente o que
 * cada importador já existente lê (services/fabricantes.ts, pneus.ts,
 * veiculos.ts, homologacoes.ts, paises.ts, homologationEvidence.ts) via
 * lib/importer/folderImport.ts. Nenhuma coluna nova inventada aqui.
 */
const FOLDER_FIELDS: Record<FolderKey, ImportField[]> = {
  brands: [
    { key: "nome", label: "Nome", required: true },
    { key: "pais", label: "País" },
    { key: "site", label: "Site" },
    { key: "observacoes", label: "Observações" },
    { key: "logo", label: "Logo (URL)" },
    { key: "status", label: "Status" },
    { key: "confianca", label: "Confiança (0-100)" },
    { key: "brandPolicy", label: "Política (APPLICATION_ONLY/OEM_AND_APPLICATION/OEM_ONLY/HISTORICAL_ONLY)" },
  ],
  vehicle_manufacturers: [
    { key: "nome", label: "Nome", required: true },
    { key: "montadora", label: "Razão social" },
    { key: "grupo", label: "Grupo automotivo" },
    { key: "pais", label: "País" },
    { key: "site", label: "Site" },
    { key: "observacoes", label: "Observações" },
    { key: "logo", label: "Logo (URL)" },
    { key: "status", label: "Status" },
    { key: "inicioComercializacao", label: "Início da comercialização" },
    { key: "fimComercializacao", label: "Fim da comercialização" },
    { key: "confianca", label: "Confiança (0-100)" },
  ],
  markets: [
    { key: "codigo", label: "Código", required: true },
    { key: "nome", label: "Nome", required: true },
    { key: "pais", label: "País (código ISO, opcional para mercado supranacional)" },
  ],
  vehicle_models: [
    { key: "marca", label: "Marca (montadora)", required: true },
    { key: "modelo", label: "Modelo", required: true },
  ],
  tire_models: [
    { key: "nome", label: "Nome do modelo", required: true },
    { key: "fabricante", label: "Fabricante (marca de pneu)", required: true },
  ],
  tire_sizes: [
    { key: "fabricante", label: "Fabricante (marca de pneu)", required: true },
    { key: "modelo", label: "Modelo", required: true },
    { key: "familia", label: "Família" },
    { key: "largura", label: "Largura", required: true },
    { key: "perfil", label: "Perfil (série)", required: true },
    { key: "aro", label: "Aro", required: true },
    { key: "indiceCarga", label: "Índice de carga", required: true },
    { key: "indiceVelocidade", label: "Índice de velocidade", required: true },
    { key: "runFlat", label: "RunFlat (sim/não)" },
    { key: "xl", label: "XL (sim/não)" },
    { key: "seal", label: "Seal/Self-sealing (sim/não)" },
    { key: "tubeless", label: "Tubeless (sim/não)" },
    { key: "categoria", label: "Categoria", required: true },
    { key: "segmento", label: "Segmento" },
    { key: "ean", label: "EAN" },
    { key: "descricao", label: "Descrição" },
    { key: "status", label: "Status" },
    { key: "tecnologias", label: "Tecnologias (separadas por ;)" },
  ],
  vehicles: [
    { key: "marca", label: "Marca (montadora)", required: true },
    { key: "modelo", label: "Modelo", required: true },
    { key: "versao", label: "Versão", required: true },
    { key: "codigoInterno", label: "Código interno" },
    { key: "anoInicial", label: "Ano inicial", required: true },
    { key: "anoFinal", label: "Ano final", required: true },
    { key: "anoFabricacaoInicial", label: "Ano de fabricação inicial" },
    { key: "anoFabricacaoFinal", label: "Ano de fabricação final" },
    { key: "motorizacao", label: "Motorização", required: true },
    { key: "potencia", label: "Potência" },
    { key: "torque", label: "Torque" },
    { key: "combustivel", label: "Combustível", required: true },
    { key: "categoria", label: "Categoria", required: true },
    { key: "categoriaRegulatoria", label: "Categoria regulatória" },
    { key: "segmento", label: "Segmento" },
    { key: "plataforma", label: "Plataforma" },
    { key: "geracao", label: "Geração" },
    { key: "transmissao", label: "Transmissão" },
    { key: "marchas", label: "Marchas" },
    { key: "tracao", label: "Tração" },
    { key: "portas", label: "Portas" },
    { key: "entreEixos", label: "Entre-eixos (mm)" },
    { key: "peso", label: "Peso (kg)" },
    { key: "pais", label: "País" },
    { key: "observacoes", label: "Observações" },
    { key: "status", label: "Status" },
  ],
  applications: [
    { key: "fabricantePneu", label: "Fabricante do pneu", required: true },
    { key: "modeloPneu", label: "Modelo do pneu", required: true },
    { key: "medida", label: "Medida", required: true },
    { key: "montadora", label: "Montadora (veículo)", required: true },
    { key: "modeloVeiculo", label: "Modelo do veículo", required: true },
    { key: "versaoVeiculo", label: "Versão do veículo" },
    { key: "anoInicial", label: "Ano inicial" },
    { key: "anoFinal", label: "Ano final" },
    { key: "fonteUrl", label: "URL da fonte", required: true },
    { key: "fonteNome", label: "Nome da fonte", required: true },
    {
      key: "tipoFonte",
      label: "Tipo da fonte (MARKETPLACE/DISTRIBUIDOR_OFICIAL/FABRICANTE_PNEU/MONTADORA/MANUAL/CATALOGO_OE)",
      required: true,
    },
    { key: "dataColeta", label: "Data da coleta (AAAA-MM-DD)" },
  ],
  homologations: [
    { key: "marca", label: "Marca (montadora)", required: true },
    { key: "modelo", label: "Modelo", required: true },
    { key: "versao", label: "Versão", required: true },
    { key: "pneuOriginalFabricante", label: "Fabricante do pneu original", required: true },
    { key: "pneuOriginalModelo", label: "Modelo do pneu original", required: true },
    { key: "pneuOriginalMedida", label: "Medida do pneu original", required: true },
    { key: "pneusOpcionais", label: "Pneus opcionais (fab|modelo|medida;...)" },
    { key: "codigo", label: "Código da homologação", required: true },
    { key: "anoModelo", label: "Ano modelo" },
    { key: "anoFabricacao", label: "Ano de fabricação" },
    { key: "observacoes", label: "Observações" },
  ],
  oe_codes: [
    { key: "montadora", label: "Montadora (veículo)", required: true },
    { key: "codigo", label: "Código OE", required: true },
    { key: "descricao", label: "Descrição" },
  ],
  technologies: [
    { key: "nome", label: "Nome", required: true },
    { key: "descricao", label: "Descrição" },
  ],
  countries: [
    { key: "isoCode", label: "Código ISO", required: true },
    { key: "nome", label: "Nome", required: true },
    { key: "regiao", label: "Região" },
  ],
  // Sem importador ainda (decisão de produto pendente — ver relatório da
  // etapa Master Data). Selecionável aqui só para não quebrar o Record;
  // qualquer tentativa de importar retorna erro claro, nada é criado.
  sources: [
    { key: "nome", label: "Nome (ainda não implementado)" },
    { key: "url", label: "URL (ainda não implementado)" },
  ],
  documents: [
    { key: "nome", label: "Nome (ainda não implementado)" },
    { key: "url", label: "URL (ainda não implementado)" },
  ],
};

function ImportWizardForFolder({
  folder,
  onClose,
}: {
  folder: FolderKey;
  onClose: () => void;
}) {
  const importar = useImportarDados(folder);
  return (
    <ImportWizard
      open
      onClose={onClose}
      title={`Importar — ${FOLDER_LABELS[folder]}`}
      fields={FOLDER_FIELDS[folder]}
      onImport={importar}
    />
  );
}

export default function ImportarDadosButton() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [folder, setFolder] = useState<FolderKey | "">("");
  const [activeFolder, setActiveFolder] = useState<FolderKey | null>(null);

  function handleContinuar() {
    if (!folder) return;
    setActiveFolder(folder);
    setPickerOpen(false);
  }

  function handleCloseWizard() {
    setActiveFolder(null);
    setFolder("");
  }

  return (
    <>
      <Button type="button" onClick={() => setPickerOpen(true)}>
        IMPORTAR DADOS
      </Button>

      <Dialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Importar dados"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Escolha qual pasta de <code>database/import/</code> você está
            importando. O CSV/XLSX pode vir dessa pasta ou de qualquer
            outro lugar — a pasta só define para qual tabela os dados vão.
          </p>

          <Select
            label="Entidade"
            options={FOLDER_KEYS.map((key) => ({ value: key, label: FOLDER_LABELS[key] }))}
            value={folder}
            onChange={(event) => setFolder(event.target.value as FolderKey)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPickerOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={!folder} onClick={handleContinuar}>
              Continuar
            </Button>
          </div>
        </div>
      </Dialog>

      {activeFolder && (
        <ImportWizardForFolder folder={activeFolder} onClose={handleCloseWizard} />
      )}
    </>
  );
}
