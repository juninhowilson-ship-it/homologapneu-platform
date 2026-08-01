import "dotenv/config";
import * as XLSX from "xlsx";
import { PrismaClient, type TireCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveManufacturerId } from "../lib/masterData/resolveManufacturer";
import { findOrCreateVehicleModelId } from "../lib/masterData/resolveVehicleModel";
import { normalizeLookupKey } from "../lib/masterData/normalizeName";

/**
 * Importa o catálogo real "DUNLOP 19-08-2025.xlsb" (planilha real fornecida
 * pelo usuário, mesma pasta da Pirelli/Continental/Bridgestone) — mesma
 * regra combinada: cadastra Montadora+Modelo+Pneu reais, nunca cria
 * Homologation real (falta motor/ano/versão). Diferente das outras marcas,
 * este arquivo já separa "EO" (Sim/Não) por linha — só homologado=true
 * quando EO="Sim" (linhas EO="Não" ainda viram Tire real, só sem vínculo
 * de veículo, porque a própria fonte declara que não é equipamento
 * original para o que estiver em Automaker/Car Model).
 *
 * Peculiaridades REAIS tratadas explicitamente (nunca adivinhadas):
 *
 * 1. Coluna "Brand" traz 4 valores reais: DUNLOP (891), FALKEN (119),
 *    SUMITOMO (29) — todos fabricantes de pneu reais e distintos — e "FK"
 *    (1 linha só), erro de digitação óbvio de "FALKEN" (mesmo padrão do
 *    "Pegeout"/"Mercedez" já corrigido no import da Continental).
 *
 * 2. Categoria "MC" (motocicleta) em Category I — 98 linhas — é
 *    inteiramente EXCLUÍDA deste import: o enum TireCategory do schema
 *    (PASSEIO/SUV/CAMINHONETE/ESPORTIVO/INVERNO/COMERCIAL) não tem opção
 *    de motocicleta, e o restante do banco (VehicleModel etc.) é
 *    inteiramente voltado a carro — forçar uma categoria de carro num
 *    pneu de moto seria um dado errado, não uma omissão.
 *
 * 3. Coluna "Automaker" às vezes lista múltiplas montadoras separadas por
 *    vírgula, pareadas com "Car Model" (mesmo separador). Verificado
 *    contra os dados reais antes de gravar (ver scripts/_inspect-dunlop*.ts
 *    desta sessão, já removidos): quando há 1 só automaker, toda a lista de
 *    Car Model pertence a ele (sem ambiguidade possível). Quando há mais
 *    de 1 automaker, só pareia POSICIONALMENTE (automaker[i] <-> model[i])
 *    quando as duas listas têm exatamente a mesma contagem de itens
 *    (confirmado real nos casos como "AUDI, PORSCHE" <-> "e-Tron, Taycan").
 *    Quando as contagens não batem (lista solta tipo "19 marcas, 45
 *    modelos" sem correspondência clara), o vínculo de veículo fica de
 *    fora — o pneu real ainda é cadastrado, só sem aplicação.
 *
 * 4. "EAN" é populado quando presente e ainda não usado por outro pneu
 *    (campo único no schema) — a fonte tem 534 EANs distintos e só 1
 *    duplicado real; no caso do duplicado, o segundo pneu fica sem EAN em
 *    vez de falhar a linha inteira.
 *
 * 5. "OE Symbol" (J, AO, RO1, MO) é o código de homologação real desta
 *    linha — grava em OeCode vinculado a cada montadora real resolvida
 *    nesta linha, igual ao já feito para a Bridgestone. Valor "*" sozinho
 *    não tem significado confirmado (mesmo critério já usado na
 *    Bridgestone) — não é gravado como código.
 *
 * 6. runFlat = true quando "Run Flat"="Sim" OU "DSST"="Sim" (DSST é o nome
 *    comercial da própria tecnologia run-flat da Dunlop).
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SOURCE_DIR = "C:/Users/Wilson/OneDrive/Desktop/TRABALHO/EQUIPAMENTOS ORIGINAIS";
const FONTE_NOME = "Dunlop/Falken/Sumitomo — Catálogo Técnico (DUNLOP 19-08-2025.xlsb)";

const BRAND_FIXES: Record<string, string> = { FK: "Falken" };

/** Categoria por combinação real (Category I|II|III) observada na planilha
 * — "MC" (motocicleta) fica inteiramente de fora (ver item 2 do comentário
 * acima). Uma combinação de baixíssima frequência e significado incerto
 * ("PC|LTR|HR", 1 linha) foi deliberadamente deixada de fora — fica
 * pendente em vez de arriscar uma categoria errada. */
const CATEGORY_BY_COMBO: Record<string, TireCategory> = {
  "PC|PCR|UHP": "ESPORTIVO",
  "PC|PCR|HP": "ESPORTIVO",
  "LT|LTR|VAN": "COMERCIAL",
  "TB|TBR|Passageiro": "COMERCIAL",
  "TB|TBR|Carga": "COMERCIAL",
  "TB|TBR|Carga / Passageiro": "COMERCIAL",
  "PC|PCR|STD": "PASSEIO",
  "PC|LTR|AT": "SUV",
  "PC|LTR|MT": "SUV",
  "PC|LTR|LTR": "SUV",
  "PC|LTR|HT": "SUV",
  "TB|TBR|TBR": "COMERCIAL",
  "LT|LTR|AT": "SUV",
  "LT|LTR|MT": "SUV",
  "PC|PCR|": "PASSEIO",
  "LT|LTR|HT": "SUV",
  "PC|PCR|HT": "SUV",
  "PC|LTR|VAN": "COMERCIAL",
};

type VeiculoResolvido = { vehicleBrand: string; vehicleModel: string };

function resolveVehicles(automakerRaw: string, carModelRaw: string): VeiculoResolvido[] {
  const brands = automakerRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const models = carModelRaw.split(",").map((s) => s.trim()).filter(Boolean);
  if (brands.length === 0 || models.length === 0) return [];
  if (brands.length === 1) {
    return models.map((m) => ({ vehicleBrand: brands[0], vehicleModel: m }));
  }
  if (brands.length === models.length) {
    return brands.map((b, i) => ({ vehicleBrand: b, vehicleModel: models[i] }));
  }
  return [];
}

async function findOrCreateTireManufacturer(name: string, country: string): Promise<number> {
  const existente = await prisma.tireManufacturer.findFirst({ where: { name } });
  if (existente) return existente.id;
  const criado = await prisma.tireManufacturer.create({
    data: { name, slug: name.toLowerCase(), country, validationStatus: "NECESSITA_VALIDACAO", source: FONTE_NOME },
    select: { id: true },
  });
  return criado.id;
}

async function findOrCreateManufacturerByName(name: string): Promise<number> {
  const existente = await resolveManufacturerId(prisma, name);
  if (existente) return existente.id;
  const criado = await prisma.manufacturer.create({
    data: { name, normalizedName: normalizeLookupKey(name), validationStatus: "NECESSITA_VALIDACAO", source: FONTE_NOME },
    select: { id: true },
  });
  return criado.id;
}

async function findOrCreateTireModelId(tireManufacturerId: number, name: string, category: TireCategory): Promise<number> {
  const existente = await prisma.tireModel.findUnique({
    where: { tireManufacturerId_name: { tireManufacturerId, name } },
    select: { id: true },
  });
  if (existente) return existente.id;
  const criado = await prisma.tireModel.create({ data: { tireManufacturerId, name, category }, select: { id: true } });
  return criado.id;
}

async function findOrCreateOeCode(vehicleManufacturerId: number, code: string): Promise<void> {
  await prisma.oeCode.upsert({
    where: { vehicleManufacturerId_code: { vehicleManufacturerId, code } },
    create: { vehicleManufacturerId, code, source: FONTE_NOME },
    update: {},
  });
}

async function main() {
  const wb = XLSX.readFile(`${SOURCE_DIR}/DUNLOP 19-08-2025.xlsb`);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

  const tireManufacturerCache = new Map<string, number>();
  const catalogCache = new Map<number, { catalogId: number; importId: number }>();

  let totalLinhas = 0;
  let linhasMotoIgnoradas = 0;
  let pneusResolvidos = 0;
  let pneusPendentes = 0;
  let veiculosResolvidos = 0;
  let oeCodesCriados = 0;
  let eansDuplicadosIgnorados = 0;
  const pendentes: string[] = [];

  const usedEans = new Set<string>();
  const existingEans = new Set(
    (await prisma.tire.findMany({ where: { ean: { not: null } }, select: { ean: true } })).map((t) => t.ean as string)
  );

  let rowNumber = 0;
  for (const raw of rows) {
    const brandRaw = String(raw["Brand"] ?? "").trim();
    const catI = String(raw["Category I"] ?? "").trim();
    if (!brandRaw) continue;
    if (catI === "MC") {
      linhasMotoIgnoradas++;
      continue;
    }

    const brand = BRAND_FIXES[brandRaw.toUpperCase()] ?? brandRaw.charAt(0) + brandRaw.slice(1).toLowerCase();
    let tireManufacturerId = tireManufacturerCache.get(brand);
    if (!tireManufacturerId) {
      tireManufacturerId = await findOrCreateTireManufacturer(brand, "Japão");
      tireManufacturerCache.set(brand, tireManufacturerId);
    }

    let catalogInfo = catalogCache.get(tireManufacturerId);
    if (!catalogInfo) {
      const catalog = await prisma.manufacturerCatalog.upsert({
        where: { tireManufacturerId_name: { tireManufacturerId, name: "Catálogo Técnico" } },
        create: { tireManufacturerId, name: "Catálogo Técnico" },
        update: {},
      });
      const catalogImport = await prisma.manufacturerCatalogImport.create({
        data: { catalogId: catalog.id, fileName: "DUNLOP 19-08-2025.xlsb", fileType: "XLSX", status: "EXECUTANDO", totalRows: 0 },
      });
      catalogInfo = { catalogId: catalog.id, importId: catalogImport.id };
      catalogCache.set(tireManufacturerId, catalogInfo);
    }

    rowNumber++;
    totalLinhas++;

    const medida = String(raw["Size Clean"] ?? "").trim();
    const tireModelName = String(raw["Commercial Pattern Clean"] ?? "").trim();
    const loadIndex = String(raw["Tire Li Simple"] ?? "").trim();
    const speedIndex = String(raw["Tire Ss"] ?? "").trim();
    const eo = String(raw["EO"] ?? "").trim();
    const automaker = String(raw["Automaker"] ?? "").trim();
    const carModel = String(raw["Car Model"] ?? "").trim();
    const oeSymbolRaw = String(raw["OE Symbol"] ?? "").trim();
    const runFlatSim = String(raw["Run Flat"] ?? "").trim() === "Sim";
    const dsstSim = String(raw["DSST"] ?? "").trim() === "Sim";
    const ean = String(raw["EAN"] ?? "").trim();
    const description = String(raw["SRB Description"] ?? raw["E- Commerce Description"] ?? "").trim();

    const rowRecord = await prisma.manufacturerCatalogRow.create({
      data: { importId: catalogInfo.importId, rowNumber, rawData: JSON.stringify(raw) },
    });

    const produto = await prisma.manufacturerProduct.create({
      data: { catalogId: catalogInfo.catalogId, rowId: rowRecord.id, medida: medida || "?", descricao: description || null },
    });

    const veiculos = eo === "Sim" ? resolveVehicles(automaker, carModel) : [];
    const codigoOe = oeSymbolRaw && oeSymbolRaw !== "*" ? oeSymbolRaw : null;

    for (const veiculo of veiculos) {
      const aplicacao = await prisma.manufacturerApplication.create({
        data: { productId: produto.id, vehicleBrand: veiculo.vehicleBrand, vehicleModel: veiculo.vehicleModel },
      });
      await prisma.manufacturerHomologation.create({
        data: { applicationId: aplicacao.id, status: "HOMOLOGADO", homologado: true },
      });
      const manufacturerId = await findOrCreateManufacturerByName(veiculo.vehicleBrand);
      const vehicleModelId = await findOrCreateVehicleModelId(prisma, manufacturerId, veiculo.vehicleModel);
      await prisma.manufacturerApplication.update({ where: { id: aplicacao.id }, data: { vehicleModelId } });
      veiculosResolvidos++;

      if (codigoOe) {
        await findOrCreateOeCode(manufacturerId, codigoOe);
        oeCodesCriados++;
      }
    }

    const catKey = `${raw["Category I"]}|${raw["Category II"]}|${raw["Category III"]}`;
    const category = CATEGORY_BY_COMBO[catKey];
    const widthMatch = medida.match(/^(\d{2,3})\/(\d{2})(?:ZR|R)(\d{2})/i);

    if (!tireModelName || !widthMatch || !loadIndex || !speedIndex || !category) {
      pneusPendentes++;
      pendentes.push(
        `${brand} ${tireModelName || "(sem nome)"} — ${medida || "(sem medida)"} (${
          !widthMatch ? "medida não reconhecida" : !category ? `categoria "${catKey}" não confirmada` : "índice ausente"
        })`
      );
      continue;
    }

    let finalEan: string | null = null;
    if (ean && !existingEans.has(ean) && !usedEans.has(ean)) {
      finalEan = ean;
      usedEans.add(ean);
    } else if (ean) {
      eansDuplicadosIgnorados++;
    }

    const tireModelId = await findOrCreateTireModelId(tireManufacturerId, tireModelName, category);
    const existente = await prisma.tire.findUnique({
      where: { tireManufacturerId_model_size: { tireManufacturerId, model: tireModelName, size: medida } },
      select: { id: true },
    });
    const tire =
      existente ??
      (await prisma.tire.create({
        data: {
          tireManufacturerId,
          tireModelId,
          brand,
          model: tireModelName,
          size: medida,
          width: Number(widthMatch[1]),
          profile: Number(widthMatch[2]),
          rim: Number(widthMatch[3]),
          loadIndex,
          speedIndex,
          runFlat: runFlatSim || dsstSim,
          xl: false,
          seal: false,
          category,
          ean: finalEan,
          description: description || null,
          validationStatus: "NECESSITA_VALIDACAO",
          source: FONTE_NOME,
        },
        select: { id: true },
      }));

    await prisma.manufacturerProduct.update({ where: { id: produto.id }, data: { tireId: tire.id } });
    await prisma.manufacturerCatalogRow.update({ where: { id: rowRecord.id }, data: { normalized: true } });
    pneusResolvidos++;
  }

  for (const { importId } of catalogCache.values()) {
    await prisma.manufacturerCatalogImport.update({
      where: { id: importId },
      data: { status: "CONCLUIDO_COM_ERROS", totalRows: totalLinhas, finishedAt: new Date() },
    });
  }

  console.log("=== RESUMO ===");
  console.log(
    JSON.stringify(
      {
        totalLinhas,
        linhasMotoIgnoradas,
        pneusResolvidos,
        pneusPendentes,
        veiculosResolvidos,
        oeCodesCriados,
        eansDuplicadosIgnorados,
        pendentesAmostra: pendentes.slice(0, 40),
      },
      null,
      2
    )
  );
  console.log("Total pendentes:", pendentes.length);
}

main()
  .catch((e) => {
    console.error("Falha geral:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
