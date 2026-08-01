"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import Dialog from "@/components/ui/Dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Pagination from "@/components/ui/Pagination";
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from "@/components/ui/Table";
import { useToast } from "@/components/ui/ToastProvider";
import {
  useCandidatosPaginado,
  useEstatisticasCuradoria,
  useUploadDocumento,
  useAtualizarCandidato,
  useAprovarCandidato,
  useRejeitarCandidato,
  useSolicitarRevisao,
  useAprovarEmLote,
  useRejeitarEmLote,
  useDesfazerAprovacao,
  fetchComparacao,
  fetchDocumentoUrl,
  type Candidato,
  type FiltrosCandidatos,
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

function BarraProgresso({ pendentes, total }: { pendentes: number; total: number }) {
  const feito = total > 0 ? Math.round(((total - pendentes) / total) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
      <div className="h-full bg-brand transition-all" style={{ width: `${feito}%` }} />
    </div>
  );
}

export default function CuradoriaPage() {
  const { showToast } = useToast();

  // --- Filtros ---
  const [statusFiltro, setStatusFiltro] = useState("PENDENTE_REVISAO");
  const [manufacturerName, setManufacturerName] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleVersion, setVehicleVersion] = useState("");
  const [tireQuery, setTireQuery] = useState("");
  const [confidenceMin, setConfidenceMin] = useState("");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    const t = setTimeout(() => {
      setQDebounced(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // Reset de página ao trocar qualquer filtro: feito nos próprios handlers
  // de onChange abaixo (setFiltro + setPage(1) juntos), não num efeito
  // separado espelhando o state — evita re-render em cascata.
  function comResetDePagina<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }
  const aoMudarStatus = comResetDePagina(setStatusFiltro);
  const aoMudarManufacturer = comResetDePagina(setManufacturerName);
  const aoMudarModel = comResetDePagina(setVehicleModel);
  const aoMudarVersion = comResetDePagina(setVehicleVersion);
  const aoMudarTire = comResetDePagina(setTireQuery);
  const aoMudarConfidence = comResetDePagina(setConfidenceMin);

  const filtros: FiltrosCandidatos = {
    status: statusFiltro || undefined,
    manufacturerName: manufacturerName || undefined,
    vehicleModel: vehicleModel || undefined,
    vehicleVersion: vehicleVersion || undefined,
    tireQuery: tireQuery || undefined,
    confidenceMin: confidenceMin ? Number(confidenceMin) : undefined,
    q: qDebounced || undefined,
    page,
    pageSize,
  };

  const { data, isLoading } = useCandidatosPaginado(filtros);
  const { data: stats } = useEstatisticasCuradoria();

  const upload = useUploadDocumento();
  const atualizar = useAtualizarCandidato();
  const aprovar = useAprovarCandidato();
  const rejeitar = useRejeitarCandidato();
  const solicitarRevisao = useSolicitarRevisao();
  const aprovarLote = useAprovarEmLote();
  const rejeitarLote = useRejeitarEmLote();
  const desfazer = useDesfazerAprovacao();

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [fonteTipo, setFonteTipo] = useState<string>("MANUAL");
  const [fonteNome, setFonteNome] = useState("");
  const [comparacao, setComparacao] = useState<Awaited<ReturnType<typeof fetchComparacao>> | null>(null);
  const [urlDocumento, setUrlDocumento] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [linhaAtiva, setLinhaAtiva] = useState<number | null>(null);
  const [confirmLote, setConfirmLote] = useState<"aprovar" | "rejeitar" | null>(null);

  const candidatos = data?.data ?? [];

  function salvarCampo(id: number, patch: Partial<Candidato>) {
    atualizar.mutate({ id, patch });
  }

  async function abrirComparacao(id: number) {
    const [dados, url] = await Promise.all([fetchComparacao(id), fetchDocumentoUrl(id)]);
    setComparacao(dados);
    setUrlDocumento(url);
  }

  function toggleSelecionado(id: number) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function alternarTodosDaPagina() {
    setSelecionados((atual) => {
      const todosMarcados = candidatos.every((c) => atual.has(c.id));
      if (todosMarcados) {
        const novo = new Set(atual);
        candidatos.forEach((c) => novo.delete(c.id));
        return novo;
      }
      const novo = new Set(atual);
      candidatos.forEach((c) => novo.add(c.id));
      return novo;
    });
  }

  // --- Atalhos de teclado: navegar (↑/↓ ou j/k), selecionar (espaço),
  // aprovar (a), rejeitar (r), desfazer (u), abrir comparação (Enter) —
  // desligado enquanto o foco está em um campo de texto/select. ---
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (candidatos.length === 0) return;

      const idxAtual = linhaAtiva != null ? candidatos.findIndex((c) => c.id === linhaAtiva) : -1;

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setLinhaAtiva(candidatos[Math.min(candidatos.length - 1, idxAtual + 1)].id);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setLinhaAtiva(candidatos[Math.max(0, idxAtual - 1)].id);
      } else if (e.key === " ") {
        e.preventDefault();
        if (linhaAtiva != null) toggleSelecionado(linhaAtiva);
      } else if ((e.key === "a" || e.key === "A") && linhaAtiva != null) {
        const c = candidatos.find((cc) => cc.id === linhaAtiva);
        if (c && c.status !== "APROVADA") {
          aprovar.mutate(
            { id: linhaAtiva },
            {
              onSuccess: () => showToast("Candidato aprovado (tecla A)", "success"),
              onError: (err) => showToast((err as Error).message, "error"),
            }
          );
        }
      } else if ((e.key === "r" || e.key === "R") && linhaAtiva != null) {
        const c = candidatos.find((cc) => cc.id === linhaAtiva);
        if (c && c.status !== "REJEITADA") {
          rejeitar.mutate({ id: linhaAtiva }, { onSuccess: () => showToast("Candidato rejeitado (tecla R)", "success") });
        }
      } else if ((e.key === "u" || e.key === "U") && linhaAtiva != null) {
        const c = candidatos.find((cc) => cc.id === linhaAtiva);
        if (c && c.status === "APROVADA") {
          desfazer.mutate(linhaAtiva, { onSuccess: () => showToast("Aprovação desfeita (tecla U)", "success") });
        }
      } else if (e.key === "Enter" && linhaAtiva != null) {
        e.preventDefault();
        abrirComparacao(linhaAtiva);
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidatos, linhaAtiva]);

  return (
    <main className="space-y-8 p-10">
      <div className="flex items-center gap-3">
        <h1 className="text-4xl font-bold">Curadoria Inteligente</h1>
        <Badge tone="warning">Somente admin</Badge>
      </div>
      <p className="text-muted-foreground">
        Upload de PDF/Excel/CSV → extração automática de candidatos → revisão humana obrigatória.
        Nenhum documento vira homologação sozinho — só depois de Aprovar aqui é que o Motor de
        Validação existente registra a evidência real. Atalhos: <kbd>↑</kbd>/<kbd>↓</kbd> navega,{" "}
        <kbd>espaço</kbd> seleciona, <kbd>A</kbd> aprova, <kbd>R</kbd> rejeita, <kbd>U</kbd> desfaz,{" "}
        <kbd>Enter</kbd> compara.
      </p>

      {/* Estatísticas em tempo real */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <h3 className="text-sm text-muted-foreground">Pendentes</h3>
          <p className="mt-2 text-3xl font-bold">{stats?.totais.PENDENTE_REVISAO ?? "—"}</p>
        </Card>
        <Card>
          <h3 className="text-sm text-muted-foreground">Confiança média</h3>
          <p className="mt-2 text-3xl font-bold">{stats?.confiancaMedia ?? "—"}%</p>
        </Card>
        <Card>
          <h3 className="text-sm text-muted-foreground">Revisados (última hora)</h3>
          <p className="mt-2 text-3xl font-bold">{stats?.revisadosUltimaHora ?? "—"}</p>
        </Card>
        <Card>
          <h3 className="text-sm text-muted-foreground">Revisados (24h)</h3>
          <p className="mt-2 text-3xl font-bold">{stats?.revisadosUltimas24h ?? "—"}</p>
        </Card>
      </div>

      {/* Progresso por montadora */}
      {stats && stats.porMontadora.length > 0 && (
        <Card>
          <h2 className="mb-4 text-lg font-bold">Progresso por montadora</h2>
          <div className="space-y-3">
            {stats.porMontadora.slice(0, 10).map((m) => (
              <div key={m.manufacturerName}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold">{m.manufacturerName}</span>
                  <span className="text-muted-foreground">
                    {m.total - m.pendentes}/{m.total} revisados · {m.pendentes} pendente(s)
                  </span>
                </div>
                <BarraProgresso pendentes={m.pendentes} total={m.total} />
              </div>
            ))}
          </div>
        </Card>
      )}

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

      {/* Filtros */}
      <Card className="space-y-4">
        <h2 className="text-lg font-bold">Filtros</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Input placeholder="Montadora" value={manufacturerName} onChange={(e) => aoMudarManufacturer(e.target.value)} />
          <Input placeholder="Modelo do veículo" value={vehicleModel} onChange={(e) => aoMudarModel(e.target.value)} />
          <Input placeholder="Versão" value={vehicleVersion} onChange={(e) => aoMudarVersion(e.target.value)} />
          <Input placeholder="Pneu (marca/modelo/medida)" value={tireQuery} onChange={(e) => aoMudarTire(e.target.value)} />
          <Input
            type="number"
            min={0}
            max={100}
            placeholder="Confiança mínima (%)"
            value={confidenceMin}
            onChange={(e) => aoMudarConfidence(e.target.value)}
          />
          <div className="md:col-span-3">
            <Input
              placeholder="Busca instantânea (pneu, veículo, nome do documento...)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => aoMudarStatus(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              statusFiltro === tab.value
                ? "bg-brand text-brand-foreground"
                : "bg-surface-muted text-muted-foreground hover:bg-border"
            }`}
          >
            {tab.label} {stats?.totais[tab.value] != null ? `(${stats.totais[tab.value]})` : ""}
          </button>
        ))}
      </div>

      {/* Barra de ações em lote */}
      {selecionados.size > 0 && (
        <div className="sticky top-0 z-10 flex items-center gap-3 rounded-lg border border-brand bg-surface p-4 shadow-lg">
          <span className="font-semibold">{selecionados.size} selecionado(s)</span>
          <Button type="button" size="sm" onClick={() => setConfirmLote("aprovar")}>
            Aprovar selecionados
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setConfirmLote("rejeitar")}>
            Rejeitar selecionados
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSelecionados(new Set())}>
            Limpar seleção
          </Button>
        </div>
      )}

      {isLoading || !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableTh>
                  <input
                    type="checkbox"
                    checked={candidatos.length > 0 && candidatos.every((c) => selecionados.has(c.id))}
                    onChange={alternarTodosDaPagina}
                  />
                </TableTh>
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
              {candidatos.map((c) => (
                <TableRow key={c.id}>
                  <TableTd className={linhaAtiva === c.id ? "bg-brand/10" : undefined}>
                    <input type="checkbox" checked={selecionados.has(c.id)} onChange={() => toggleSelecionado(c.id)} />
                  </TableTd>
                  <TableTd
                    className="max-w-[140px] cursor-pointer truncate text-xs"
                    title={c.documentUpload.fileName}
                    onClick={() => setLinhaAtiva(c.id)}
                  >
                    {c.documentUpload.fileName}
                    <br />
                    <span className="text-muted-foreground">{c.documentUpload.manufacturerName ?? c.documentUpload.declaredSourceName}</span>
                    {c.documentUpload.ocrPending && (
                      <>
                        <br />
                        <span className="text-amber-600">Pendente de OCR</span>
                      </>
                    )}
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
                      <Button type="button" size="sm" variant="secondary" onClick={() => abrirComparacao(c.id)}>
                        Comparar
                      </Button>
                      {c.status !== "APROVADA" && (
                        <Button type="button" size="sm" onClick={() => aprovar.mutate({ id: c.id })} disabled={aprovar.isPending}>
                          Aprovar
                        </Button>
                      )}
                      {c.status === "APROVADA" && (
                        <Button type="button" size="sm" variant="secondary" onClick={() => desfazer.mutate(c.id)} disabled={desfazer.isPending}>
                          Desfazer
                        </Button>
                      )}
                      {c.status !== "REJEITADA" && (
                        <Button type="button" size="sm" variant="secondary" onClick={() => rejeitar.mutate({ id: c.id })} disabled={rejeitar.isPending}>
                          Rejeitar
                        </Button>
                      )}
                      {c.status === "PENDENTE_REVISAO" && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => solicitarRevisao.mutate({ id: c.id })} disabled={solicitarRevisao.isPending}>
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
              {candidatos.length === 0 && (
                <TableRow>
                  <TableTd colSpan={13} className="text-center text-muted-foreground">
                    Nenhum candidato para estes filtros.
                  </TableTd>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}

      {/* Comparação lado a lado: PDF x dados extraídos x homologação proposta */}
      <Dialog open={comparacao !== null} onClose={() => { setComparacao(null); setUrlDocumento(null); }} title="Comparar evidências" size="lg">
        {comparacao && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <h3 className="mb-2 font-bold">Documento original</h3>
              {urlDocumento && comparacao.candidato.documentUpload.fileType === "PDF" ? (
                <iframe src={urlDocumento} className="h-[420px] w-full rounded border border-border" title="Documento original" />
              ) : urlDocumento ? (
                <a href={urlDocumento} target="_blank" rel="noreferrer" className="text-sm text-brand underline">
                  Abrir arquivo original
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">Arquivo não disponível no Storage.</p>
              )}
              {comparacao.candidato.rawSnippet && (
                <div className="mt-2 rounded bg-surface-muted p-2 text-xs">
                  <strong>Trecho de origem:</strong> {comparacao.candidato.rawSnippet}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 font-bold">Dados extraídos</h3>
              <dl className="space-y-1 text-sm">
                <div><dt className="inline text-muted-foreground">Pneu: </dt><dd className="inline">{comparacao.candidato.tireManufacturerName} {comparacao.candidato.tireModel}</dd></div>
                <div><dt className="inline text-muted-foreground">Medida: </dt><dd className="inline">{comparacao.candidato.tireSize ?? "—"}</dd></div>
                <div><dt className="inline text-muted-foreground">Índices: </dt><dd className="inline">{comparacao.candidato.loadIndex ?? "—"}/{comparacao.candidato.speedIndex ?? "—"}</dd></div>
                <div><dt className="inline text-muted-foreground">Veículo: </dt><dd className="inline">{comparacao.candidato.vehicleManufacturerName} {comparacao.candidato.vehicleModel} {comparacao.candidato.vehicleVersion}</dd></div>
                <div><dt className="inline text-muted-foreground">Anos: </dt><dd className="inline">{comparacao.candidato.yearStart ?? "?"}–{comparacao.candidato.yearEnd ?? "?"}</dd></div>
                <div><dt className="inline text-muted-foreground">Confiança: </dt><dd className="inline">{comparacao.candidato.extractionConfidence}%</dd></div>
              </dl>
            </div>

            <div>
              <h3 className="mb-2 font-bold">Homologação proposta (se aprovado)</h3>
              <p className="text-xs text-muted-foreground">
                Ao aprovar, o Motor de Validação existente cria/atualiza a Homologation real com estes
                dados (find-or-create — nunca duplica). Se faltar dado suficiente, fica registrada só
                a evidência, sem publicar.
              </p>
              <h4 className="mt-3 font-semibold">
                Aplicações já conhecidas para este veículo ({comparacao.aplicacoesRelacionadas.length})
              </h4>
              <div className="mt-2 space-y-2">
                {comparacao.aplicacoesRelacionadas.map(
                  (a: { id: number; tireManufacturerName: string; tireModel: string; tireSize: string; status: string; confidence: number; evidences: unknown[] }) => (
                    <div key={a.id} className="rounded border border-border p-2 text-sm">
                      <p className="font-semibold">{a.tireManufacturerName} {a.tireModel} — {a.tireSize}</p>
                      <p className="text-xs text-muted-foreground">Status: {a.status} · Confiança: {a.confidence} · {a.evidences.length} evidência(s)</p>
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

      <ConfirmDialog
        open={confirmLote !== null}
        title={confirmLote === "aprovar" ? "Aprovar em lote" : "Rejeitar em lote"}
        description={`Confirma ${confirmLote === "aprovar" ? "aprovar" : "rejeitar"} ${selecionados.size} candidato(s) selecionado(s)?`}
        confirmLabel={confirmLote === "aprovar" ? "Aprovar todos" : "Rejeitar todos"}
        destructive={confirmLote === "rejeitar"}
        loading={aprovarLote.isPending || rejeitarLote.isPending}
        onCancel={() => setConfirmLote(null)}
        onConfirm={() => {
          const ids = [...selecionados];
          const mutation = confirmLote === "aprovar" ? aprovarLote : rejeitarLote;
          mutation.mutate(
            { ids },
            {
              onSuccess: (resposta) => {
                showToast(`${resposta.sucesso} aprovado(s)/rejeitado(s), ${resposta.falhas} falha(s).`, resposta.falhas > 0 ? "error" : "success");
                setSelecionados(new Set());
                setConfirmLote(null);
              },
              onError: (err) => {
                showToast((err as Error).message, "error");
                setConfirmLote(null);
              },
            }
          );
        }}
      />
    </main>
  );
}
