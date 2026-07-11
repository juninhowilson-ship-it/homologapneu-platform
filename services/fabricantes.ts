import "server-only";
import {
  listFabricantes as listFabricantesRepo,
  findFabricanteById,
  findFabricanteByName,
  createFabricante as createFabricanteRepo,
  updateFabricante as updateFabricanteRepo,
  deleteFabricante as deleteFabricanteRepo,
  type FabricanteRecord,
} from "@/repositories/fabricantes";
import { NotFoundError, ConflictError } from "@/lib/errors";
import type {
  FabricanteFormValues,
  FabricanteListQuery,
} from "@/lib/validations/fabricante";
import type { Fabricante, FabricanteListResponse } from "@/types/fabricante";

function toDTO(record: FabricanteRecord): Fabricante {
  return {
    id: record.id,
    name: record.name,
    country: record.country,
    website: record.website,
    notes: record.notes,
    logoUrl: record.logoUrl,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    tiresCount: record._count.tires,
  };
}

function normalizeInput(input: FabricanteFormValues) {
  return {
    name: input.name,
    country: input.country,
    website: input.website ? input.website : null,
    notes: input.notes ? input.notes : null,
    logoUrl: input.logoUrl ? input.logoUrl : null,
    isActive: input.isActive,
  };
}

export async function listFabricantes(
  query: FabricanteListQuery
): Promise<FabricanteListResponse> {
  const { data, total } = await listFabricantesRepo(query);

  return {
    data: data.map(toDTO),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getFabricante(id: number): Promise<Fabricante> {
  const record = await findFabricanteById(id);

  if (!record) {
    throw new NotFoundError("Fabricante não encontrado");
  }

  return toDTO(record);
}

export async function createFabricante(
  input: FabricanteFormValues
): Promise<Fabricante> {
  const existing = await findFabricanteByName(input.name);
  if (existing) {
    throw new ConflictError("Já existe um fabricante com este nome");
  }

  const record = await createFabricanteRepo(normalizeInput(input));
  return toDTO(record);
}

export async function updateFabricante(
  id: number,
  input: FabricanteFormValues
): Promise<Fabricante> {
  const current = await findFabricanteById(id);
  if (!current) {
    throw new NotFoundError("Fabricante não encontrado");
  }

  const existing = await findFabricanteByName(input.name, id);
  if (existing) {
    throw new ConflictError("Já existe um fabricante com este nome");
  }

  const record = await updateFabricanteRepo(id, normalizeInput(input));
  return toDTO(record);
}

export async function deleteFabricante(id: number): Promise<void> {
  const current = await findFabricanteById(id);
  if (!current) {
    throw new NotFoundError("Fabricante não encontrado");
  }

  if (current._count.tires > 0) {
    throw new ConflictError(
      `Não é possível excluir: existem ${current._count.tires} pneu(s) associado(s) a este fabricante. Marque-o como inativo em vez de excluir.`
    );
  }

  await deleteFabricanteRepo(id);
}
