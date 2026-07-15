"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import Dialog from "@/components/ui/Dialog";
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from "@/components/ui/Table";
import {
  useCandidatos,
  useUploadDocumento,
  useAtualizarCandidato,
  useAprovarCandidato,
  useRejeitarCandidato,
  useSolicitarRevisao,
  fetchComparacao,
  type Candidato,
} from "@/hooks/useCuradoria";
import { SOURCE_TYPE_LABEL } from "@/lib/constants/evidence";

const STATUS_TABS = [
  { value: "PENDENTE_REVISAO", label: "Pendente Revisão" },
  { value: "APROVADA", label: "Aprovada" },
  { value: "REJEITADA", label: "Rejeitada" },
  { value: "SOLICITAR_REVISAO", label: "Solicitar Revisão" },
  { value: "", label: "Todos" },
];

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  PENDENTE_REVISAO: "neutral",
  APROVADA: "success",
  REJEITADA: "danger",
  SOLICITAR_REVISAO: "warning",
};

function CampoEditavel({
  candidato,
  campo,
  onSalvar,
}: {
  candidato: Candidato;
  campo: keyof Candidato;
  onSalvar: (id: number, patch: Partial<Candidato>) => void;
}) {
  const valor = candidato[campo];
  const [texto, setTexto] = useState(valor == null ? "" : String(valor));

  return (
    <input
      className="w-32 rounded border border-border bg-transparent px-1 py-0.5 text-xs"
      value={texto}
      placeholder="—"
      disabled={candidato.status !== "PENDENTE_REVISAO" && candidato.status !== "SOLICITAR_REVISAO"}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => {
        if (texto === (valor == null ? "" : String(valor))) return;
        onSalvar(candidato.id, { [campo]: texto || null } as Partial<Candidato>);
      }}
    />
  );
}

export default function CuradoriaPage() {
  const [statusFiltro, setStatusFiltro] = useState("PENDENTE_REVISAO");
  const { data, isLoading } = useCandidatos(statusFiltro || undefined);
  const upload = useUploadDocumento();
  const atualizar = useAtualizarCandidato();
  const aprovar = useAprovarCandidato();
  const rejeitar = useRejeitarCandidato();
  const solicitarRevisao = useSolicitarRevisao();

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [fonteTipo, setFonteTipo] = useState<string>("MANUAL");
  const [fonteNome, setFonteNome] = useState("");
  const [comparacao, setComparacao] = useState<Awaited<ReturnType<typeof fetchComparacao>> | null>(null);

  function salvarCampo(id: number, patch: Partial<Candidato>) {
    atualizar.mutate({ id, patch });
  }

  async function abrirComparacao(id: number) {
    const dados = await fetchComparacao(id);
    setComparacao(dados);
  }

  return (
    <main className="space-y-8 p-10">
      <div className="flex items-center gap-3">
        <h1 className="text-4xl font-bold">Curadoria Inteligente</h1>
        <Badge tone="warning">Somente admin</Badge>
      </div>
      <p className="text-muted-foreground">
        Upload de PDF/Excel/CSV → extração automática de candidatos →
        revisão humana obrigatória. Nenhum documento vira homologação
        sozinho — só depois de Aprovar aqui é que o Motor de Validação
        existente registra a evidência real.
      </p>

      <Card className="space-y-4">
        <h2 className="text-lg font-bold">Enviar documento</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Arquivo (PDF, XLSX ou CSV)</label>
            <input
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Tipo da fonte</label>
            <Select
              value={fonteTipo}
              onChange={(e) => setFonteTipo(e.target.value)}
              hidePlaceholder
              options={Object.entries(SOURCE_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Nome da fonte</label>
            <Input
              value={fonteNome}
              onChange={(e) => setFonteNome(e.target.value)}
              placeholder="ex.: Catálogo técnico Pirelli 2026"
            />
          </div>
          <Button
            type="button"
            disabled={!arquivo || !fonteNome || upload.isPending}
            onClick={() => {
              if (!arquivo) return;
              const formData = new FormData();
              formData.append("file", arquivo);
              formData.append("declaredSourceType", fonteTipo);
              formData.append("declaredSourceName", fonteNome);
              upload.mutate(formData, {
                onSuccess: () => {
                  setArquivo(null);
                  setFonteNome("");
                },
              });
            }}
          >
            {upload.isPending ? "Enviando..." : "Enviar e Extrair"}
          </Button>
        </div>
        {upload.data && (
          <p className="text-sm text-muted-foreground">
            {upload.data.duplicado
              ? "Este arquivo já tinha sido enviado antes (mesmo hash) — mostrando os candidatos já extraídos."
              : `${upload.data.candidatos?.length ?? 0} candidato(s) extraído(s).`}
            {upload.data.erro && <span className="text-red-600"> Erro: {upload.data.erro}</span>}
          </p>
        )}
        {upload.isError && <p className="text-sm text-red-600">{(upload.error as Error).message}</p>}
      </Card>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFiltro(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              statusFiltro === tab.value
                ? "bg-brand text-brand-foreground"
                : "bg-surface-muted text-muted-foreground hover:bg-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>Documento</TableTh>
              <TableTh>Fabricante Pneu</TableTh>
              <TableTh>Modelo Pneu</TableTh>
              <TableTh>Medida</TableTh>
              <TableTh>Índices</TableTh>
              <TableTh>Marca Veículo</TableTh>
              <TableTh>Modelo</TableTh>
              <TableTh>Versão</TableTh>
              <TableTh>Anos</TableTh>
              <TableTh>Confiança</TableTh>
              <TableTh>Status</TableTh>
              <TableTh>Ações</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((c) => (
              <TableRow key={c.id}>
                <TableTd className="max-w-[140px] truncate text-xs" title={c.documentUpload.fileName}>
                  {c.documentUpload.fileName}
                  <br />
                  <span className="text-muted-foreground">{c.documentUpload.declaredSourceName}</span>
                </TableTd>
                <TableTd>
                  <CampoEditavel candidato={c} campo="tireManufacturerName" onSalvar={salvarCampo} />
                </TableTd>
                <TableTd>
                  <CampoEditavel candidato={c} campo="tireModel" onSalvar={salvarCampo} />
                </TableTd>
                <TableTd>
                  <CampoEditavel candidato={c} campo="tireSize" onSalvar={salvarCampo} />
                </TableTd>
                <TableTd className="text-xs">
                  {c.loadIndex ?? "—"}/{c.speedIndex ?? "—"}
                </TableTd>
                <TableTd>
                  <CampoEditavel candidato={c} campo="vehicleManufacturerName" onSalvar={salvarCampo} />
                </TableTd>
                <TableTd>
                  <CampoEditavel candidato={c} campo="vehicleModel" onSalvar={salvarCampo} />
                </TableTd>
                <TableTd>
                  <CampoEditavel candidato={c} campo="vehicleVersion" onSalvar={salvarCampo} />
                </TableTd>
                <TableTd className="text-xs">
                  {c.yearStart ?? "?"}–{c.yearEnd ?? "?"}
                </TableTd>
                <TableTd>{c.extractionConfidence}%</TableTd>
                <TableTd>
                  <Badge tone={STATUS_TONE[c.status] ?? "neutral"}>{c.status}</Badge>
                </TableTd>
                <TableTd>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => abrirComparacao(c.id)}
                    >
                      Comparar
                    </Button>
                    {c.status !== "APROVADA" && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => aprovar.mutate({ id: c.id })}
                        disabled={aprovar.isPending}
                      >
                        Aprovar
                      </Button>
                    )}
                    {c.status !== "REJEITADA" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => rejeitar.mutate({ id: c.id })}
                        disabled={rejeitar.isPending}
                      >
                        Rejeitar
                      </Button>
                    )}
                    {c.status === "PENDENTE_REVISAO" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => solicitarRevisao.mutate({ id: c.id })}
                        disabled={solicitarRevisao.isPending}
                      >
                        Solicitar Revisão
                      </Button>
                    )}
                  </div>
                  {aprovar.isError && aprovar.variables?.id === c.id && (
                    <p className="mt-1 text-xs text-red-600">{(aprovar.error as Error).message}</p>
                  )}
                </TableTd>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableTd colSpan={12} className="text-center text-muted-foreground">
                  Nenhum candidato nesse status.
                </TableTd>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={comparacao !== null} onClose={() => setComparacao(null)} title="Comparar evidências" size="lg">
        {comparacao && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold">Candidato extraído</h3>
              <pre className="mt-2 overflow-x-auto rounded bg-surface-muted p-3 text-xs">
                {JSON.stringify(comparacao.candidato, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-bold">
                Aplicações já conhecidas para esse veículo ({comparacao.aplicacoesRelacionadas.length})
              </h3>
              <div className="mt-2 space-y-2">
                {comparacao.aplicacoesRelacionadas.map(
                  (a: { id: number; tireManufacturerName: string; tireModel: string; tireSize: string; status: string; confidence: number; evidences: unknown[] }) => (
                    <div key={a.id} className="rounded border border-border p-2 text-sm">
                      <p className="font-semibold">
                        {a.tireManufacturerName} {a.tireModel} — {a.tireSize}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Status: {a.status} · Confiança: {a.confidence} · {a.evidences.length} evidência(s)
                      </p>
                    </div>
                  )
                )}
                {comparacao.aplicacoesRelacionadas.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma aplicação relacionada encontrada ainda.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </main>
  );
}
