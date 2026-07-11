import "server-only";
import { getDb } from "@/lib/db/client";
import type { PesquisaFiltros } from "@/lib/validations/pesquisa";
import type { ResultadoPesquisa } from "@/types/homologation";

type ResultadoRow = {
  homologacaoId: number;
  homologacaoCodigo: string;
  veiculoFabricante: string;
  veiculoModelo: string;
  veiculoAno: number;
  veiculoMotorizacao: string;
  pneuFabricante: string;
  pneuModelo: string;
  pneuMedida: string;
  pneuIndiceCarga: string;
  pneuIndiceVelocidade: string;
  pneuRunFlat: number;
  pneuXl: number;
};

export function buscarHomologacoes(
  filtros: PesquisaFiltros
): ResultadoPesquisa[] {
  const db = getDb();

  const condicoes: string[] = [];
  const parametros: (string | number)[] = [];

  if (filtros.fabricante) {
    condicoes.push("m.name = ?");
    parametros.push(filtros.fabricante);
  }
  if (filtros.modelo) {
    condicoes.push("v.model = ?");
    parametros.push(filtros.modelo);
  }
  if (filtros.ano) {
    condicoes.push("v.year = ?");
    parametros.push(Number(filtros.ano));
  }
  if (filtros.motorizacao) {
    condicoes.push("v.engine = ?");
    parametros.push(filtros.motorizacao);
  }
  if (filtros.medida) {
    condicoes.push("t.size = ?");
    parametros.push(filtros.medida);
  }
  if (filtros.homologacao) {
    condicoes.push("h.code = ?");
    parametros.push(filtros.homologacao);
  }
  if (filtros.fabricantePneu) {
    condicoes.push("tm.name = ?");
    parametros.push(filtros.fabricantePneu);
  }
  if (filtros.runFlat) {
    condicoes.push("t.run_flat = ?");
    parametros.push(filtros.runFlat === "true" ? 1 : 0);
  }
  if (filtros.xl) {
    condicoes.push("t.xl = ?");
    parametros.push(filtros.xl === "true" ? 1 : 0);
  }
  if (filtros.indiceCarga) {
    condicoes.push("t.load_index = ?");
    parametros.push(filtros.indiceCarga);
  }
  if (filtros.indiceVelocidade) {
    condicoes.push("t.speed_index = ?");
    parametros.push(filtros.indiceVelocidade);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `
      SELECT
        h.id AS homologacaoId,
        h.code AS homologacaoCodigo,
        m.name AS veiculoFabricante,
        v.model AS veiculoModelo,
        v.year AS veiculoAno,
        v.engine AS veiculoMotorizacao,
        tm.name AS pneuFabricante,
        t.model AS pneuModelo,
        t.size AS pneuMedida,
        t.load_index AS pneuIndiceCarga,
        t.speed_index AS pneuIndiceVelocidade,
        t.run_flat AS pneuRunFlat,
        t.xl AS pneuXl
      FROM homologations h
      JOIN vehicles v ON v.id = h.vehicle_id
      JOIN manufacturers m ON m.id = v.manufacturer_id
      JOIN tires t ON t.id = h.tire_id
      JOIN tire_manufacturers tm ON tm.id = t.tire_manufacturer_id
      ${where}
      ORDER BY m.name, v.model
      `
    )
    .all(...parametros) as ResultadoRow[];

  return rows.map((row) => ({
    ...row,
    pneuRunFlat: Boolean(row.pneuRunFlat),
    pneuXl: Boolean(row.pneuXl),
  }));
}
