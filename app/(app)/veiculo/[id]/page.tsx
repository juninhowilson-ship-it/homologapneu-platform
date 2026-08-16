import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertCircle,
  BadgeCheck,
  Car,
  CheckCircle2,
  Disc,
  FileCheck2,
  FileText,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Breadcrumb from "@/components/ui/Breadcrumb";
import StatCard from "@/components/ui/StatCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableTh,
  TableTd,
} from "@/components/ui/Table";
import {
  FUEL_LABELS,
  CATEGORY_LABELS,
  SEGMENT_LABELS,
  TRANSMISSION_LABELS,
  DRIVETRAIN_LABELS,
} from "@/lib/constants/veiculo";
import {
  VALIDATION_STATUS_LABELS,
  VALIDATION_STATUS_TONE,
} from "@/lib/constants/validacao";
import { obterFichaVeiculo } from "@/services/veiculoFicha";
import TimelineVeiculo from "@/components/veiculo/TimelineVeiculo";
import GaleriaVeiculo from "@/components/veiculo/GaleriaVeiculo";
import SalvarVeiculoButton from "@/components/garagem/SalvarVeiculoButton";
import BaixarPdfButton from "@/components/veiculo/BaixarPdfButton";
import AssistenteChat from "@/components/assistente/AssistenteChat";
import { GitCompareArrows } from "lucide-react";
import type { HomologacaoTireItem } from "@/types/homologacao";

export const dynamic = "force-dynamic";

function formatarFaixaAno(inicio: number, fim: number) {
  return inicio === fim ? String(inicio) : `${inicio}-${fim}`;
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function formatarTamanho(bytes: number | null) {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const AVISOS_SEGURANCA = [
  "Sempre utilizar pneus e índices conforme o manual do proprietário.",
  "A utilização de pneus não homologados pode comprometer a segurança.",
  "Verifique a pressão recomendada na etiqueta da porta do motorista.",
  "Medidas equivalentes devem respeitar os índices de carga e velocidade.",
];

export default async function VeiculoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const veiculoId = Number(id);

  if (!Number.isFinite(veiculoId)) notFound();

  const ficha = await obterFichaVeiculo(veiculoId);
  if (!ficha) notFound();

  const { veiculo, versoesIrmas, homologacoes, medidas, documentos, timeline } =
    ficha;

  // Linhas da tabela de medidas: uma por pneu homologado, original primeiro
  const linhasMedidas = homologacoes
    .flatMap((h) =>
      h.tires.map((tire) => ({ tire, codigo: h.code, ano: h.year }))
    )
    .sort((a, b) =>
      a.tire.role === b.tire.role ? 0 : a.tire.role === "ORIGINAL" ? -1 : 1
    );

  // Pneus originais distintos (a "homologação OE" de fábrica)
  const pneusOriginais: HomologacaoTireItem[] = [];
  const idsOriginais = new Set<number>();
  for (const h of homologacoes) {
    for (const tire of h.tires) {
      if (tire.role === "ORIGINAL" && !idsOriginais.has(tire.tireId)) {
        idsOriginais.add(tire.tireId);
        pneusOriginais.push(tire);
      }
    }
  }

  const pneusDistintos = new Set(
    homologacoes.flatMap((h) => h.tires.map((t) => t.tireId))
  );
  const documentosHomologacao = homologacoes.flatMap((h) => h.documents);
  const totalDocumentos = documentosHomologacao.length + documentos.length;
  const pressaoReferencia = homologacoes
    .flatMap((h) => h.pressureSpecs)
    .find((p) => p.emptyFront || p.emptyRear);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <Breadcrumb
          items={[
            { label: "Início", href: "/dashboard" },
            { label: "Veículos", href: "/pesquisa" },
            { label: veiculo.manufacturerName },
            { label: veiculo.model },
            { label: `${veiculo.version} ${formatarFaixaAno(veiculo.yearStart, veiculo.yearEnd)}` },
          ]}
        />

        <div className="flex items-center gap-2">
          {pneusDistintos.size > 0 && (
            <Link
              href={`/comparador?ids=${Array.from(pneusDistintos).slice(0, 3).join(",")}`}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand/50"
            >
              <GitCompareArrows size={16} />
              Comparar Pneus
            </Link>
          )}
          <BaixarPdfButton />
        </div>
      </div>

      {/* Cabeçalho do veículo */}
      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row">
        <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-muted">
          {veiculo.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={veiculo.imageUrl}
              alt={`${veiculo.manufacturerName} ${veiculo.model}`}
              className="h-full w-full object-contain"
            />
          ) : (
            <Car className="text-muted-foreground" size={40} />
          )}
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                {veiculo.manufacturerLogoUrl && (
                  <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={veiculo.manufacturerLogoUrl}
                      alt={veiculo.manufacturerName}
                      className="h-full w-full object-contain"
                    />
                  </span>
                )}
                <Badge tone="warning">{CATEGORY_LABELS[veiculo.category]}</Badge>
                {veiculo.segment && (
                  <span className="text-xs text-muted-foreground">
                    {SEGMENT_LABELS[veiculo.segment]}
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-3xl font-extrabold text-foreground">
                {veiculo.manufacturerName} {veiculo.model}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {formatarFaixaAno(veiculo.yearStart, veiculo.yearEnd)} ·{" "}
                {veiculo.version} · {FUEL_LABELS[veiculo.fuel]} ·{" "}
                {veiculo.engine}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Badge tone={veiculo.isActive ? "success" : "danger"}>
                  {veiculo.isActive ? "Ativo" : "Inativo"}
                </Badge>
                <Badge tone={VALIDATION_STATUS_TONE[veiculo.validationStatus]}>
                  <ShieldCheck size={12} className="mr-1 inline" />
                  {VALIDATION_STATUS_LABELS[veiculo.validationStatus]}
                </Badge>
              </div>
              <SalvarVeiculoButton vehicleVersionId={veiculo.id} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Potência</p>
              <p className="font-semibold">{veiculo.power ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Transmissão</p>
              <p className="font-semibold">
                {veiculo.transmissionType
                  ? TRANSMISSION_LABELS[veiculo.transmissionType]
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Tração</p>
              <p className="font-semibold">
                {veiculo.drivetrain ? DRIVETRAIN_LABELS[veiculo.drivetrain] : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Homologações</p>
              <p className="font-semibold">{homologacoes.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal: abas + painel lateral */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="resumo">
            <TabsList>
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="medidas">Medidas Homologadas</TabsTrigger>
              <TabsTrigger value="originais">Pneus Originais</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="resumo" className="pt-6">
              <section className="rounded-xl border border-border bg-surface p-5">
                <h2 className="mb-4 text-lg font-bold text-foreground">
                  Ficha técnica
                </h2>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
                  {[
                    { rotulo: "Geração", valor: veiculo.generationName },
                    { rotulo: "Plataforma", valor: veiculo.platformName },
                    { rotulo: "Combustível", valor: FUEL_LABELS[veiculo.fuel] },
                    { rotulo: "Motor", valor: veiculo.engine },
                    { rotulo: "Potência", valor: veiculo.power },
                    { rotulo: "Torque", valor: veiculo.torque },
                    {
                      rotulo: "Transmissão",
                      valor: veiculo.transmissionType
                        ? `${TRANSMISSION_LABELS[veiculo.transmissionType]}${
                            veiculo.transmissionGears
                              ? ` (${veiculo.transmissionGears} marchas)`
                              : ""
                          }`
                        : null,
                    },
                    {
                      rotulo: "Tração",
                      valor: veiculo.drivetrain
                        ? DRIVETRAIN_LABELS[veiculo.drivetrain]
                        : null,
                    },
                    { rotulo: "Carroceria", valor: CATEGORY_LABELS[veiculo.category] },
                    {
                      rotulo: "Portas",
                      valor: veiculo.doors ? String(veiculo.doors) : null,
                    },
                    {
                      rotulo: "Entre-eixos",
                      valor: veiculo.wheelbase ? `${veiculo.wheelbase} mm` : null,
                    },
                    {
                      rotulo: "Peso",
                      valor: veiculo.weight ? `${veiculo.weight} kg` : null,
                    },
                    { rotulo: "Mercado", valor: veiculo.country },
                    {
                      rotulo: "Categoria regulatória",
                      valor: veiculo.regulatoryCategory,
                    },
                  ]
                    .filter((campo) => campo.valor)
                    .map((campo) => (
                      <div key={campo.rotulo}>
                        <p className="text-muted-foreground">{campo.rotulo}</p>
                        <p className="font-semibold text-foreground">{campo.valor}</p>
                      </div>
                    ))}
                </div>
              </section>

              {versoesIrmas.length > 1 && (
                <section className="mt-8">
                  <h2 className="mb-3 text-lg font-bold text-foreground">
                    Todas as versões
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {versoesIrmas.map((versao) => (
                      <Link
                        key={versao.id}
                        href={`/veiculo/${versao.id}`}
                        className={`rounded-xl border px-4 py-3 text-sm transition ${
                          versao.id === veiculo.id
                            ? "border-brand bg-brand/10 font-semibold text-foreground"
                            : "border-border bg-surface hover:border-brand/50"
                        }`}
                      >
                        <p className="font-semibold">{versao.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatarFaixaAno(versao.yearStart, versao.yearEnd)} ·{" "}
                          {versao.engineName}
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {medidas.length > 0 && (
                <section className="mt-8">
                  <h2 className="mb-3 text-lg font-bold text-foreground">
                    Todas as medidas
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {medidas.map((medida) => (
                      <span
                        key={medida}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-4 py-2 text-sm font-semibold"
                      >
                        <Gauge size={13} className="text-brand" />
                        {medida}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <GaleriaVeiculo imagens={ficha.imagens} />
            </TabsContent>

            <TabsContent value="medidas" className="pt-6">
              <div className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="border-b border-border bg-surface-secondary px-5 py-4">
                  <h2 className="flex items-center gap-2 font-bold text-foreground">
                    <Disc size={18} className="text-brand" />
                    Medidas Homologadas
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Opções aprovadas pela montadora para este veículo
                  </p>
                </div>
                {linhasMedidas.length > 0 ? (
                  <Table>
                    <TableHead>
                      <tr>
                        <TableTh>Medida</TableTh>
                        <TableTh>Pneu</TableTh>
                        <TableTh>Tipo</TableTh>
                        <TableTh>Características</TableTh>
                        <TableTh>Homologação</TableTh>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {linhasMedidas.map(({ tire, codigo, ano }) => (
                        <TableRow key={tire.id}>
                          <TableTd className="font-mono font-bold text-foreground">
                            {tire.size}
                          </TableTd>
                          <TableTd>{tire.tireLabel}</TableTd>
                          <TableTd>
                            <Badge
                              tone={tire.role === "ORIGINAL" ? "success" : "neutral"}
                            >
                              {tire.role === "ORIGINAL" ? "Original" : "Alternativa"}
                            </Badge>
                          </TableTd>
                          <TableTd className="text-muted-foreground">
                            {[
                              tire.runFlat ? "Run Flat" : null,
                              tire.xl ? "XL" : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </TableTd>
                          <TableTd className="text-muted-foreground">
                            <span className="font-mono">{codigo}</span> · {ano}
                          </TableTd>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="px-5 py-6 text-sm text-muted-foreground">
                    Nenhuma medida homologada registrada para este veículo.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="originais" className="pt-6">
              {pneusOriginais.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {pneusOriginais.map((tire) => (
                    <div
                      key={tire.tireId}
                      className="rounded-xl border border-border bg-surface p-5"
                    >
                      <Badge tone="success">
                        <BadgeCheck size={12} className="mr-1 inline" />
                        Homologado de fábrica
                      </Badge>
                      <p className="mt-3 font-mono text-2xl font-bold text-foreground">
                        {tire.size}
                      </p>
                      <p className="mt-1 font-semibold text-foreground">
                        {tire.tireLabel}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tire.tireManufacturerName}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {[
                          tire.runFlat ? "Run Flat" : "Convencional",
                          tire.xl ? "Reforçado (XL)" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum pneu original de fábrica registrado.
                </p>
              )}
            </TabsContent>

            <TabsContent value="documentos" className="pt-6">
              {totalDocumentos > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {documentosHomologacao.map((doc) => (
                    <a
                      key={`h-${doc.id}`}
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-border bg-surface p-4 text-sm font-semibold text-foreground transition hover:border-brand/50 hover:text-brand"
                    >
                      <FileCheck2 size={16} className="shrink-0" />
                      <span className="truncate">{doc.name}</span>
                      <span className="ml-auto shrink-0 text-xs font-normal text-muted-foreground">
                        {[formatarTamanho(doc.fileSizeBytes), doc.publishedAt ? formatarData(doc.publishedAt) : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </a>
                  ))}
                  {documentos.map((doc) => (
                    <a
                      key={`v-${doc.id}`}
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-border bg-surface p-4 text-sm font-semibold text-foreground transition hover:border-brand/50 hover:text-brand"
                    >
                      <FileText size={16} className="shrink-0" />
                      <span className="truncate">{doc.name}</span>
                      <span className="ml-auto shrink-0 text-xs font-normal text-muted-foreground">
                        {formatarData(doc.createdAt)}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum documento vinculado a este veículo.
                </p>
              )}
            </TabsContent>

            <TabsContent value="historico" className="pt-6">
              <TimelineVeiculo eventos={timeline} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Painel lateral */}
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="border-b border-border bg-surface-secondary px-5 py-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-brand">
                Pneus Originais de Fábrica
              </h2>
            </div>
            <div className="p-5">
              {pneusOriginais[0] ? (
                <>
                  <p className="font-mono text-2xl font-bold text-foreground">
                    {pneusOriginais[0].size}
                  </p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Marca</p>
                      <p className="font-semibold">
                        {pneusOriginais[0].tireManufacturerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Modelo</p>
                      <p className="font-semibold">{pneusOriginais[0].tireLabel}</p>
                    </div>
                    {pressaoReferencia && (
                      <div>
                        <p className="text-muted-foreground">
                          Pressão (dianteira / traseira)
                        </p>
                        <p className="font-semibold">
                          {pressaoReferencia.emptyFront ?? "—"} /{" "}
                          {pressaoReferencia.emptyRear ?? "—"}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sem registro de pneu original.
                </p>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="border-b border-border bg-surface-secondary px-5 py-3">
              <h2 className="text-sm font-bold text-foreground">
                Informações Importantes
              </h2>
            </div>
            <ul className="space-y-3 p-5 text-sm">
              {AVISOS_SEGURANCA.map((aviso, index) => (
                <li key={index} className="flex items-start gap-2">
                  {index < 3 ? (
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 shrink-0 text-green-400"
                    />
                  ) : (
                    <AlertCircle
                      size={16}
                      className="mt-0.5 shrink-0 text-brand"
                    />
                  )}
                  <span className="text-foreground/90">{aviso}</span>
                </li>
              ))}
            </ul>
          </div>

          {totalDocumentos > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="border-b border-border bg-surface-secondary px-5 py-3">
                <h2 className="text-sm font-bold text-foreground">
                  Documentos e Catálogos
                </h2>
              </div>
              <div className="space-y-2 p-5">
                {[...documentosHomologacao, ...documentos]
                  .slice(0, 4)
                  .map((doc, index) => (
                    <a
                      key={index}
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm font-semibold text-foreground transition hover:text-brand"
                    >
                      <FileText size={14} className="shrink-0 text-red-400" />
                      <span className="truncate">{doc.name}</span>
                    </a>
                  ))}
              </div>
            </div>
          )}

          <AssistenteChat
            contexto={`${veiculo.manufacturerName} ${veiculo.model} ${veiculo.version}`}
            alturaClasse="h-64"
          />
        </div>
      </div>

      {/* Contadores */}
      <div className="mt-8 grid grid-cols-2 gap-6 rounded-xl border border-border bg-surface p-6 sm:grid-cols-4">
        <StatCard
          icon={Gauge}
          value={String(medidas.length)}
          label="Medidas homologadas"
        />
        <StatCard
          icon={Disc}
          value={String(pneusDistintos.size)}
          label="Pneus compatíveis"
        />
        <StatCard
          icon={FileCheck2}
          value={String(homologacoes.length)}
          label="Homologações"
        />
        <StatCard
          icon={FileText}
          value={String(totalDocumentos)}
          label="Documentos"
        />
      </div>
    </div>
  );
}
