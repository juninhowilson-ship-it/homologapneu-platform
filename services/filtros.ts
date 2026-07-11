import "server-only";
import { getDb } from "@/lib/db/client";
import type { OpcoesFiltroPesquisa } from "@/types/homologation";

export function listarOpcoesFiltro(): OpcoesFiltroPesquisa {
  const db = getDb();

  const fabricantes = (
    db.prepare("SELECT DISTINCT name FROM manufacturers ORDER BY name").all() as {
      name: string;
    }[]
  ).map((row) => row.name);

  const modelos = (
    db.prepare("SELECT DISTINCT model FROM vehicles ORDER BY model").all() as {
      model: string;
    }[]
  ).map((row) => row.model);

  const anos = (
    db
      .prepare("SELECT DISTINCT year FROM vehicles ORDER BY year DESC")
      .all() as { year: number }[]
  ).map((row) => row.year);

  const motorizacoes = (
    db.prepare("SELECT DISTINCT engine FROM vehicles ORDER BY engine").all() as {
      engine: string;
    }[]
  ).map((row) => row.engine);

  const medidas = (
    db.prepare("SELECT DISTINCT size FROM tires ORDER BY size").all() as {
      size: string;
    }[]
  ).map((row) => row.size);

  const homologacoes = (
    db.prepare("SELECT DISTINCT code FROM homologations ORDER BY code").all() as {
      code: string;
    }[]
  ).map((row) => row.code);

  const fabricantesPneu = (
    db
      .prepare("SELECT DISTINCT name FROM tire_manufacturers ORDER BY name")
      .all() as { name: string }[]
  ).map((row) => row.name);

  const indicesCarga = (
    db
      .prepare(
        "SELECT DISTINCT load_index FROM tires ORDER BY CAST(load_index AS INTEGER)"
      )
      .all() as { load_index: string }[]
  ).map((row) => row.load_index);

  const indicesVelocidade = (
    db
      .prepare("SELECT DISTINCT speed_index FROM tires ORDER BY speed_index")
      .all() as { speed_index: string }[]
  ).map((row) => row.speed_index);

  return {
    fabricantes,
    modelos,
    anos,
    motorizacoes,
    medidas,
    homologacoes,
    fabricantesPneu,
    indicesCarga,
    indicesVelocidade,
  };
}
