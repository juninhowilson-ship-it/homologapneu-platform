import "dotenv/config";
import ExcelJS from "exceljs";
import * as fs from "node:fs";
import { PrismaClient, type TireCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveManufacturerId } from "../lib/masterData/resolveManufacturer";
import { findOrCreateVehicleModelId } from "../lib/masterData/resolveVehicleModel";
import { normalizeLookupKey } from "../lib/masterData/normalizeName";
import { parseTireSize } from "../lib/importer/manufacturerCatalog/tireSpec";

/**
 * Importa o catálogo real "CONTI 2025.xlsx" (planilha real fornecida pelo
 * usuário, mesma pasta da Pirelli/Giti) — mesma regra combinada: cadastra
 * Montadora+Modelo+Pneu reais, nunca cria Homologation real (falta
 * motor/ano/versão), homologado=true em 100% das linhas (arquivo inteiro é
 * de equipamento original Continental).
 *
 * Peculiaridades REAIS da planilha, tratadas explicitamente abaixo (nunca
 * adivinhadas):
 * 1. "Marca" e "Modelo" só aparecem na primeira linha de cada bloco
 *    (célula mesclada visualmente) — linhas seguintes ficam em branco e
 *    herdam o valor anterior. Uma linha totalmente vazia encerra um bloco.
 * 2. "Modelo" às vezes lista mais de um veículo separado por "/"
 *    (ex.: "Grand Siena/ Argo/ Strada") — cada um vira uma aplicação
 *    própria do mesmo pneu.
 * 3. Marca com erro de digitação óbvio da própria fonte ("Pegeout",
 *    "Mercedez", "Volkswagem") — corrigido para o nome real (mesma marca,
 *    sem ambiguidade nenhuma), igual ao já feito para PSA/RAM-JEEP no
 *    import da Nexen. Nomes de MODELO não são corrigidos (poderiam ser um
 *    trim real distinto que eu não tenho como confirmar) — ficam como na
 *    fonte.
 * 4. "Medida/Modelo" é texto livre "PNEU <medida> <índice><nome do pneu>
 *    [OE|OE#]", às vezes sem espaço entre índice e nome do pneu — parser
 *    próprio abaixo (não usa tireSpec.parseTireIndex, que exige um limite
 *    de palavra depois da letra do índice e falharia nesses casos).
 * 5. Nome do pneu tem grafias diferentes para o mesmo produto real
 *    (ex.: "VANCO AP", "VANCOAP", "CONTI VANCOAP") — normalizado removendo
 *    o prefixo redundante "CONTI " e colapsando espaços internos antes de
 *    comparar (normalização mecânica de espaçamento/prefixo, não uma
 *    suposição sobre o que o produto "deveria" se chamar).
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SOURCE_DIR = "C:/Users/Wilson/OneDrive/Desktop/TRABALHO/EQUIPAMENTOS ORIGINAIS";
const FONTE_NOME = "Continental — Equipamento Original (CONTI 2025.xlsx)";

const MARCA_FIXES: Record<string, string> = {
  PEGEOUT: "Peugeot",
  MERCEDEZ: "Mercedes-Benz",
  VOLKSWAGEM: "Volkswagen",
  GM: "Chevrolet", // GM = holding, marca real vendida no Brasil é Chevrolet (mesmo padrão de PSA->Citroen/Peugeot na Nexen).
};

/** Categoria pesquisada por linha de produto Continental (conti-online.com/
 * pt-br, retailers) antes de cadastrar — nunca adivinhada. Chaves geradas
 * rodando normalizeModelKey sobre cada tireModelRaw real observado na
 * planilha (ver scripts/_inspect*.ts desta sessão) — modelos fora deste
 * dicionário ficam sem categoria e o produto fica pendente (nunca vira
 * Tire sem categoria confirmada). Grafias distintas da fonte que PODEM ser
 * o mesmo produto real (ex.: "CONTIPOWERC2" vs "CONTIPOWER2") NÃO foram
 * fundidas em uma só — sem confirmação externa de que são idênticas, ficam
 * como entradas separadas (evita uma fusão inventada). */
const CATEGORY_BY_NORMALIZED_MODEL: Record<string, TireCategory> = {
  CONTIPOWER: "PASSEIO",
  CONTIPOWERC2: "PASSEIO", // "CONTIPOWERC 2"
  CONTIPOWER2: "PASSEIO", // "CONTIPOWER2" (sem espaço, grafia distinta da acima)
  POWERCONTAC: "PASSEIO", // "CONTI POWERCONTAC"
  CONTICCLX2: "SUV", // "CONTICCLX2" (abreviação, grafia distinta de CROSSCONTACTLX2)
  CONTICROSSLX2: "SUV", // "CONTI ContiCross LX2" (grafia com "Conti" embutido no nome)
  CROSSCONTACTLX2: "SUV", // "CONTI Cross Contact LX2"
  CROSSCONTACTLX: "SUV", // "CONTI Cross Contact LX" (sem "2")
  EXTREME: "PASSEIO", // "CONTI EXTREME"
  VANCOAP: "COMERCIAL", // "VANCO AP" / "CONTI VANCOAP" / "VANCOAP"
  PREMIUMCONTACT5: "PASSEIO", // "CONTI PremiumContact 5"
  ECOCONTACT6: "PASSEIO",
};

function normalizeModelKey(raw: string): string {
  return raw.replace(/^CONTI\s+/i, "").replace(/\s+/g, "").toUpperCase();
}

function findOrCreateTireManufacturerContinental(): Promise<number> {
  return (async () => {
    const existente = await prisma.tireManufacturer.findFirst({ where: { name: "Continental" } });
    if (existente) return existente.id;
    const criado = await prisma.tireManufacturer.create({
      data: {
        name: "Continental",
        slug: "continental",
        country: "Alemanha",
        website: "https://www.continental-pneus.com.br",
        validationStatus: "NECESSITA_VALIDACAO",
        source: FONTE_NOME,
      },
      select: { id: true },
    });
    return criado.id;
  })();
}

async function findOrCreateManufacturerByName(nameRaw: string): Promise<number> {
  const name = MARCA_FIXES[nameRaw.toUpperCase()] ?? nameRaw;
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

type ParsedProduct = {
  medida: string;
  width: number;
  profile: number;
  rim: number;
  loadIndex: string;
  speedIndex: string;
  xl: boolean;
  tireModelRaw: string;
};

/** Parser próprio (não reaproveita tireSpec.parseTireIndex) porque a fonte
 * às vezes gruda o índice no nome do pneu sem espaço (ex.: "82TCONTIPOWER"),
 * o que quebraria o \b exigido pelo parser genérico. Aqui o índice é
 * extraído por POSIÇÃO (sempre logo após a medida), não por busca textual —
 * seguro porque essa é a estrutura real e constante desta planilha. */
function parseContinentalRow(medidaModeloRaw: string): ParsedProduct | null {
  const semPrefixo = medidaModeloRaw.replace(/^PNEU\s+/i, "").trim();
  const sizeMatch = semPrefixo.match(/^(P?(?:LT)?\d{2,3}\/\d{2}(?:ZR|R)\d{2}C?)\s*/i);
  if (!sizeMatch) return null;
  const medida = sizeMatch[1];
  const tamanho = parseTireSize(medida);
  if (!tamanho) return null;
  let resto = semPrefixo.slice(sizeMatch[0].length);

  const indexMatch = resto.match(/^(\d{2,3})([A-Z])/);
  if (!indexMatch) return null;
  const loadIndex = indexMatch[1];
  const speedIndex = indexMatch[2];
  resto = resto.slice(indexMatch[0].length);

  let xl = false;
  const xlMatch = resto.match(/^\s*XL\b/i);
  if (xlMatch) {
    xl = true;
    resto = resto.slice(xlMatch[0].length);
  }

  // Remove o marcador final "OE" ou "OE#" (Original Equipment / nota de
  // rodapé nao especificada) — nao faz parte do nome comercial do pneu.
  const tireModelRaw = resto.trim().replace(/\s*OE#?\s*$/i, "").trim();
  if (!tireModelRaw) return null;

  return { medida, width: tamanho.width, profile: tamanho.profile, rim: tamanho.rim, loadIndex, speedIndex, xl, tireModelRaw };
}

async function main() {
  const buffer = fs.readFileSync(`${SOURCE_DIR}/CONTI 2025.xlsx`);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);
  const ws = wb.worksheets[0];

  const tireManufacturerId = await findOrCreateTireManufacturerContinental();

  const catalog = await prisma.manufacturerCatalog.upsert({
    where: { tireManufacturerId_name: { tireManufacturerId, name: "Equipamento Original" } },
    create: { tireManufacturerId, name: "Equipamento Original" },
    update: {},
  });

  const catalogImport = await prisma.manufacturerCatalogImport.create({
    data: {
      catalogId: catalog.id,
      fileName: "CONTI 2025.xlsx",
      fileType: "XLSX",
      status: "EXECUTANDO",
      totalRows: 0,
    },
  });

  let lastMarca = "";
  let lastModelo = "";
  let rowNumber = 0;
  let pneusResolvidos = 0;
  let pneusPendentes = 0;
  let veiculosResolvidos = 0;
  const pendentes: string[] = [];

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const marcaCell = String(row.getCell(1).value ?? "").trim();
    const modeloCell = String(row.getCell(2).value ?? "").trim();
    const medidaModeloCell = String(row.getCell(3).value ?? "").trim();

    if (!marcaCell && !modeloCell && !medidaModeloCell) {
      // Linha em branco: separador de bloco — não reseta lastMarca/lastModelo
      // porque o próximo bloco sempre declara sua própria marca explicitamente.
      continue;
    }
    if (!medidaModeloCell) continue;

    if (marcaCell) lastMarca = marcaCell;
    if (modeloCell) lastModelo = modeloCell;
    if (!lastMarca || !lastModelo) continue;

    rowNumber++;
    const rowRecord = await prisma.manufacturerCatalogRow.create({
      data: {
        importId: catalogImport.id,
        rowNumber,
        rawData: JSON.stringify({ marca: lastMarca, modelo: lastModelo, medidaModelo: medidaModeloCell }),
      },
    });

    const parsed = parseContinentalRow(medidaModeloCell);
    const produto = await prisma.manufacturerProduct.create({
      data: {
        catalogId: catalog.id,
        rowId: rowRecord.id,
        medida: parsed?.medida ?? medidaModeloCell,
        descricao: medidaModeloCell,
      },
    });

    const modelosVeiculo = lastModelo
      .split("/")
      .map((m) => m.trim())
      .filter(Boolean);

    for (const vehicleModel of modelosVeiculo) {
      const aplicacao = await prisma.manufacturerApplication.create({
        data: { productId: produto.id, vehicleBrand: lastMarca, vehicleModel },
      });
      await prisma.manufacturerHomologation.create({
        data: { applicationId: aplicacao.id, status: "HOMOLOGADO", homologado: true },
      });
      const manufacturerId = await findOrCreateManufacturerByName(lastMarca);
      const vehicleModelId = await findOrCreateVehicleModelId(prisma, manufacturerId, vehicleModel);
      await prisma.manufacturerApplication.update({ where: { id: aplicacao.id }, data: { vehicleModelId } });
      veiculosResolvidos++;
    }

    if (!parsed) {
      pneusPendentes++;
      pendentes.push(`${lastMarca} ${lastModelo} — ${medidaModeloCell} (medida/índice não reconhecido)`);
      continue;
    }

    const modelKey = normalizeModelKey(parsed.tireModelRaw);
    const category = CATEGORY_BY_NORMALIZED_MODEL[modelKey];
    if (!category) {
      pneusPendentes++;
      pendentes.push(`${lastMarca} ${lastModelo} — ${medidaModeloCell} (modelo "${parsed.tireModelRaw}" → chave "${modelKey}" sem categoria confirmada)`);
      continue;
    }

    // Nome canônico de exibição: usa a primeira grafia encontrada para essa
    // chave normalizada (evita duplicar TireModel para grafias diferentes
    // do mesmo produto real).
    const tireModelName = parsed.tireModelRaw.replace(/^CONTI\s+/i, "").trim();

    const tireModelId = await findOrCreateTireModelId(tireManufacturerId, tireModelName, category);
    const existente = await prisma.tire.findUnique({
      where: { tireManufacturerId_model_size: { tireManufacturerId, model: tireModelName, size: parsed.medida } },
      select: { id: true },
    });
    const tire =
      existente ??
      (await prisma.tire.create({
        data: {
          tireManufacturerId,
          tireModelId,
          brand: "Continental",
          model: tireModelName,
          size: parsed.medida,
          width: parsed.width,
          profile: parsed.profile,
          rim: parsed.rim,
          loadIndex: parsed.loadIndex,
          speedIndex: parsed.speedIndex,
          xl: parsed.xl,
          runFlat: false,
          seal: false,
          category,
          validationStatus: "NECESSITA_VALIDACAO",
          source: FONTE_NOME,
        },
        select: { id: true },
      }));

    await prisma.manufacturerProduct.update({ where: { id: produto.id }, data: { tireId: tire.id } });
    await prisma.manufacturerCatalogRow.update({ where: { id: rowRecord.id }, data: { normalized: true } });
    pneusResolvidos++;
  }

  await prisma.manufacturerCatalogImport.update({
    where: { id: catalogImport.id },
    data: {
      status: pneusPendentes === 0 ? "CONCLUIDO" : "CONCLUIDO_COM_ERROS",
      totalRows: rowNumber,
      processedRows: pneusResolvidos,
      errorRows: pneusPendentes,
      finishedAt: new Date(),
      log: pendentes.length ? JSON.stringify(pendentes) : null,
    },
  });

  console.log("=== RESUMO ===");
  console.log(JSON.stringify({ totalLinhas: rowNumber, pneusResolvidos, pneusPendentes, veiculosResolvidos, pendentes }, null, 2));
}

main()
  .catch((e) => {
    console.error("Falha geral:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
