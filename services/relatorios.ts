import "server-only";
import ExcelJS from "exceljs";
import { buscarHomologacoes } from "@/services/pesquisa";
import type { PesquisaFiltros } from "@/lib/validations/pesquisa";
import { VALIDATION_STATUS_LABELS } from "@/lib/constants/validacao";
import type { ResultadoPesquisa } from "@/types/homologation";

const TIPO_PNEU_LABEL: Record<ResultadoPesquisa["pneuTipo"], string> = {
  ORIGINAL: "Original",
  OPCIONAL: "Opcional",
  SUBSTITUTO: "Substituto",
};

const COLUNAS: {
  header: string;
  key: string;
  width: number;
  valor: (resultado: ResultadoPesquisa) => string | number;
}[] = [
  { header: "Homologação", key: "homologacao", width: 14, valor: (r) => r.homologacaoCodigo },
  { header: "Ano Homologação", key: "anoHomologacao", width: 16, valor: (r) => r.homologacaoAno },
  {
    header: "Confiabilidade",
    key: "confiabilidade",
    width: 20,
    valor: (r) => VALIDATION_STATUS_LABELS[r.homologacaoConfiabilidade],
  },
  { header: "Fabricante", key: "fabricante", width: 16, valor: (r) => r.veiculoFabricante },
  { header: "Modelo", key: "modelo", width: 16, valor: (r) => r.veiculoModelo },
  { header: "Versão", key: "versao", width: 16, valor: (r) => r.veiculoVersao },
  {
    header: "Ano Fabricação",
    key: "anoFabricacao",
    width: 16,
    valor: (r) =>
      r.veiculoAnoInicial === r.veiculoAnoFinal
        ? String(r.veiculoAnoInicial)
        : `${r.veiculoAnoInicial}-${r.veiculoAnoFinal}`,
  },
  { header: "Motorização", key: "motorizacao", width: 16, valor: (r) => r.veiculoMotorizacao },
  { header: "Tipo de Pneu", key: "tipoPneu", width: 14, valor: (r) => TIPO_PNEU_LABEL[r.pneuTipo] },
  { header: "Fabricante do Pneu", key: "fabricantePneu", width: 18, valor: (r) => r.pneuFabricante },
  { header: "Modelo do Pneu", key: "modeloPneu", width: 20, valor: (r) => r.pneuModelo },
  { header: "Medida", key: "medida", width: 14, valor: (r) => r.pneuMedida },
  { header: "Índice de Carga", key: "indiceCarga", width: 16, valor: (r) => r.pneuIndiceCarga },
  {
    header: "Índice de Velocidade",
    key: "indiceVelocidade",
    width: 18,
    valor: (r) => r.pneuIndiceVelocidade,
  },
  { header: "Run Flat", key: "runFlat", width: 10, valor: (r) => (r.pneuRunFlat ? "Sim" : "Não") },
  { header: "XL", key: "xl", width: 8, valor: (r) => (r.pneuXl ? "Sim" : "Não") },
  {
    header: "Pressão Dianteira",
    key: "pressaoDianteira",
    width: 16,
    valor: (r) => r.pressaoDianteira ?? "—",
  },
  {
    header: "Pressão Traseira",
    key: "pressaoTraseira",
    width: 16,
    valor: (r) => r.pressaoTraseira ?? "—",
  },
  {
    header: "Atualizado em",
    key: "atualizadoEm",
    width: 16,
    valor: (r) => new Date(r.homologacaoAtualizadoEm).toLocaleDateString("pt-BR"),
  },
];

export async function gerarPlanilhaHomologacoes(
  filtros: PesquisaFiltros
): Promise<ExcelJS.Buffer> {
  const resultados = await buscarHomologacoes(filtros);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HomologaPneu";
  workbook.created = new Date();

  const planilha = workbook.addWorksheet("Homologações");
  planilha.columns = COLUNAS.map((coluna) => ({
    header: coluna.header,
    key: coluna.key,
    width: coluna.width,
  }));
  planilha.getRow(1).font = { bold: true };
  planilha.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUNAS.length } };

  for (const resultado of resultados) {
    planilha.addRow(
      Object.fromEntries(COLUNAS.map((coluna) => [coluna.key, coluna.valor(resultado)]))
    );
  }

  return workbook.xlsx.writeBuffer();
}
