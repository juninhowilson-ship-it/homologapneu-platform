import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  reconhecerCandidato,
  calcularConfianca,
  type Dicionario,
} from "@/lib/curadoria/extracaoPura";

/**
 * npm run quality:extraction
 *
 * Fase de Melhoria da Qualidade da Extração — só leitura, nada é
 * alterado no banco. Re-roda o RECONHECIMENTO (não a extração completa,
 * que exigiria reprocessar o PDF original) da lógica nova
 * (lib/curadoria/extracaoPura.ts) sobre o `rawSnippet` já salvo de cada
 * HomologationCandidate PENDENTE_REVISAO — puramente em memória, dry-run,
 * comparando contra os valores antigos já armazenados. Nenhum candidato é
 * reescrito; isto só mede o que teria mudado.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function carregarDicionarioDoScript(): Promise<Dicionario> {
  const [manufacturers, models, versions, tireManufacturers, tireFamilies] = await Promise.all([
    prisma.manufacturer.findMany({ select: { name: true } }),
    prisma.vehicleModel.findMany({ select: { name: true, manufacturer: { select: { name: true } } } }),
    prisma.vehicleVersion.findMany({
      select: { name: true, vehicleModel: { select: { name: true, manufacturer: { select: { name: true } } } } },
    }),
    prisma.tireManufacturer.findMany({ select: { name: true } }),
    prisma.tireFamily.findMany({ select: { name: true, tireManufacturer: { select: { name: true } } } }),
  ]);

  const vehicleModelsByManufacturer = new Map<string, string[]>();
  for (const m of models) {
    const chave = m.manufacturer.name.toLowerCase();
    if (!vehicleModelsByManufacturer.has(chave)) vehicleModelsByManufacturer.set(chave, []);
    vehicleModelsByManufacturer.get(chave)!.push(m.name);
  }
  for (const lista of vehicleModelsByManufacturer.values()) lista.sort((a, b) => b.length - a.length);

  const vehicleVersionsByModel = new Map<string, string[]>();
  for (const v of versions) {
    const chave = `${v.vehicleModel.manufacturer.name.toLowerCase()}|${v.vehicleModel.name.toLowerCase()}`;
    if (!vehicleVersionsByModel.has(chave)) vehicleVersionsByModel.set(chave, []);
    vehicleVersionsByModel.get(chave)!.push(v.name);
  }
  for (const lista of vehicleVersionsByModel.values()) lista.sort((a, b) => b.length - a.length);

  const tireFamiliesByManufacturer = new Map<string, string[]>();
  for (const f of tireFamilies) {
    const chave = f.tireManufacturer.name.toLowerCase();
    if (!tireFamiliesByManufacturer.has(chave)) tireFamiliesByManufacturer.set(chave, []);
    tireFamiliesByManufacturer.get(chave)!.push(f.name);
  }
  for (const lista of tireFamiliesByManufacturer.values()) lista.sort((a, b) => b.length - a.length);

  return {
    vehicleManufacturers: manufacturers.map((m) => m.name).sort((a, b) => b.length - a.length),
    vehicleModelsByManufacturer,
    vehicleVersionsByModel,
    tireManufacturers: tireManufacturers.map((m) => m.name).sort((a, b) => b.length - a.length),
    tireFamiliesByManufacturer,
  };
}

function bucket(conf: number): "alta" | "media" | "baixa" {
  if (conf >= 80) return "alta";
  if (conf >= 50) return "media";
  return "baixa";
}

function classificarMotivo(base: {
  vehicleManufacturerName: string | null;
  vehicleModel: string | null;
  tireManufacturerName: string | null;
  tireModel: string | null;
  loadIndex: string | null;
  speedIndex: string | null;
}): string {
  if (!base.vehicleManufacturerName && !base.tireManufacturerName) {
    return "Nenhuma identidade reconhecida na janela (layout desconhecido / contexto insuficiente)";
  }
  if (!base.vehicleManufacturerName) return "Sem marca de veículo reconhecida";
  if (!base.vehicleModel) return "Marca de veículo reconhecida, mas modelo não";
  if (!base.tireManufacturerName) return "Sem marca de pneu reconhecida";
  if (!base.tireModel) return "Marca de pneu reconhecida, mas família/modelo não catalogado";
  if (!base.loadIndex || !base.speedIndex) return "Índice de carga/velocidade ausente ou não reconhecido";
  return "Identidade completa (confiança baixa por outro motivo)";
}

async function main() {
  console.log("=== Relatório de Qualidade da Extração (dry-run, somente leitura) ===\n");

  const dicionario = await carregarDicionarioDoScript();
  console.log(
    `Dicionário: ${dicionario.vehicleManufacturers.length} montadoras, ` +
      `${dicionario.tireManufacturers.length} fabricantes de pneu, ` +
      `${[...dicionario.tireFamiliesByManufacturer.values()].reduce((a, l) => a + l.length, 0)} famílias de pneu catalogadas, ` +
      `${[...dicionario.vehicleVersionsByModel.values()].reduce((a, l) => a + l.length, 0)} versões catalogadas.\n`
  );

  const candidatos = await prisma.homologationCandidate.findMany({
    where: { status: "PENDENTE_REVISAO" },
    select: {
      id: true,
      rawSnippet: true,
      tireSize: true,
      extractionConfidence: true,
      tireManufacturerName: true,
      tireModel: true,
      vehicleManufacturerName: true,
      vehicleModel: true,
      vehicleVersion: true,
      loadIndex: true,
      speedIndex: true,
      documentUpload: { select: { manufacturerName: true } },
    },
  });

  console.log(`Candidatos pendentes analisados: ${candidatos.length}\n`);

  const camposAntes = {
    tireManufacturerName: 0, tireModel: 0, vehicleManufacturerName: 0,
    vehicleModel: 0, vehicleVersion: 0, loadIndex: 0, speedIndex: 0,
    wheelSize: 0, frontTirePressure: 0, rearTirePressure: 0,
  };
  const camposDepois = { ...camposAntes };
  const confAntes = { alta: 0, media: 0, baixa: 0 };
  const confDepois = { alta: 0, media: 0, baixa: 0 };
  const motivos: Record<string, number> = {};
  let falsosPositivosCorrigidos = 0;
  let melhorou = 0;
  let piorou = 0;
  let semSnippet = 0;

  for (const c of candidatos) {
    if (!c.rawSnippet || !c.tireSize) {
      semSnippet++;
      continue;
    }

    camposAntes.tireManufacturerName += c.tireManufacturerName ? 1 : 0;
    camposAntes.tireModel += c.tireModel ? 1 : 0;
    camposAntes.vehicleManufacturerName += c.vehicleManufacturerName ? 1 : 0;
    camposAntes.vehicleModel += c.vehicleModel ? 1 : 0;
    camposAntes.vehicleVersion += c.vehicleVersion ? 1 : 0;
    camposAntes.loadIndex += c.loadIndex ? 1 : 0;
    camposAntes.speedIndex += c.speedIndex ? 1 : 0;
    confAntes[bucket(c.extractionConfidence)]++;

    const novo = reconhecerCandidato(c.rawSnippet, c.tireSize, dicionario);
    const novaConfianca = calcularConfianca(novo);

    camposDepois.tireManufacturerName += novo.tireManufacturerName ? 1 : 0;
    camposDepois.tireModel += novo.tireModel ? 1 : 0;
    camposDepois.vehicleManufacturerName += novo.vehicleManufacturerName ? 1 : 0;
    camposDepois.vehicleModel += novo.vehicleModel ? 1 : 0;
    camposDepois.vehicleVersion += novo.vehicleVersion ? 1 : 0;
    camposDepois.loadIndex += novo.loadIndex ? 1 : 0;
    camposDepois.speedIndex += novo.speedIndex ? 1 : 0;
    camposDepois.wheelSize += novo.wheelSize ? 1 : 0;
    camposDepois.frontTirePressure += novo.frontTirePressure ? 1 : 0;
    camposDepois.rearTirePressure += novo.rearTirePressure ? 1 : 0;
    confDepois[bucket(novaConfianca)]++;

    // Falso-positivo de nome curto (RAM/MG/GAC/JAC/...) corrigido pelo
    // match de palavra inteira: tinha marca de veículo antes, e a nova
    // lógica não encontra mais NENHUMA marca na mesma janela.
    if (c.vehicleManufacturerName && !novo.vehicleManufacturerName) {
      falsosPositivosCorrigidos++;
    }

    if (novaConfianca > c.extractionConfidence) melhorou++;
    else if (novaConfianca < c.extractionConfidence) piorou++;

    const motivo = classificarMotivo(novo);
    motivos[motivo] = (motivos[motivo] ?? 0) + 1;
  }

  const total = candidatos.length - semSnippet;
  function taxa(n: number) {
    return `${n}/${total} (${((n / total) * 100).toFixed(1)}%)`;
  }

  console.log("--- TAXA DE EXTRAÇÃO POR CAMPO (antes -> depois da correção) ---");
  console.log(`Marca de veículo:      ${taxa(camposAntes.vehicleManufacturerName)}  ->  ${taxa(camposDepois.vehicleManufacturerName)}`);
  console.log(`Modelo de veículo:     ${taxa(camposAntes.vehicleModel)}  ->  ${taxa(camposDepois.vehicleModel)}`);
  console.log(`Versão/trim:           ${taxa(camposAntes.vehicleVersion)}  ->  ${taxa(camposDepois.vehicleVersion)}`);
  console.log(`Marca de pneu:         ${taxa(camposAntes.tireManufacturerName)}  ->  ${taxa(camposDepois.tireManufacturerName)}`);
  console.log(`Família/modelo pneu:   ${taxa(camposAntes.tireModel)}  ->  ${taxa(camposDepois.tireModel)}`);
  console.log(`Índice de carga:       ${taxa(camposAntes.loadIndex)}  ->  ${taxa(camposDepois.loadIndex)}`);
  console.log(`Índice de velocidade:  ${taxa(camposAntes.speedIndex)}  ->  ${taxa(camposDepois.speedIndex)}`);
  console.log(`Roda/aro (novo campo): nunca extraído  ->  ${taxa(camposDepois.wheelSize)}`);
  console.log(`Pressão dianteira (novo campo): nunca extraído  ->  ${taxa(camposDepois.frontTirePressure)}`);
  console.log(`Pressão traseira (novo campo):  nunca extraído  ->  ${taxa(camposDepois.rearTirePressure)}`);

  console.log("\n--- DISTRIBUIÇÃO DE CONFIANÇA (antes -> depois) ---");
  console.log(`Alta (>=80):  ${confAntes.alta}  ->  ${confDepois.alta}`);
  console.log(`Média (50-79): ${confAntes.media}  ->  ${confDepois.media}`);
  console.log(`Baixa (<50):  ${confAntes.baixa}  ->  ${confDepois.baixa}`);
  console.log(`\nCandidatos que melhoraram de confiança: ${melhorou}`);
  console.log(`Candidatos que pioraram de confiança: ${piorou} (esperado — falso-positivo de nome curto removido)`);
  console.log(`Falsos-positivos de marca por substring curta corrigidos: ${falsosPositivosCorrigidos}`);
  if (semSnippet) console.log(`Candidatos sem rawSnippet/tireSize (não analisados): ${semSnippet}`);

  console.log("\n--- CAUSAS MAIS FREQUENTES DE BAIXA CONFIANÇA (com a lógica nova) ---");
  const motivosOrdenados = Object.entries(motivos).sort((a, b) => b[1] - a[1]);
  for (const [motivo, contagem] of motivosOrdenados) {
    console.log(`  ${contagem} — ${motivo}`);
  }

  console.log("\n--- MELHORIAS SUGERIDAS (para além do que já foi implementado nesta fase) ---");
  console.log("1. Ampliar o dicionário de TireFamily (hoje só 12 famílias) — cada aprovação manual");
  console.log("   de candidato com tireModel preenchido no painel de Curadoria cresce esse dicionário");
  console.log("   organicamente (mesmo mecanismo já usado para VehicleModel/VehicleVersion).");
  console.log("2. Layout desconhecido / nenhuma identidade na janela: considerar aumentar a janela");
  console.log("   (hoje 220 chars) só quando o documento already tem manufacturerName declarado (crawler");
  console.log("   já sabe a montadora-alvo) — usar esse dado como uma segunda fonte de verdade em vez de");
  console.log("   depender só do texto ao redor da medida.");
  console.log("3. Pressão sem rótulo de eixo claro fica de fora por design (nunca adivinha) — considerar");
  console.log("   reconhecer também abreviações comuns em tabelas (\"Diant.\"/\"Tras.\", \"D\"/\"T\" em colunas)");
  console.log("   caso apareçam com frequência nos próximos documentos.");
}

main()
  .catch((e) => {
    console.error("ERRO:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
