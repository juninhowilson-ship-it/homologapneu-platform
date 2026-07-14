import "server-only";
import { listMontadoras } from "@/repositories/montadoras";
import { fetchPbeRows, isPdftotextAvailable, PBE_PDF_URL, PBE_TABLE_YEAR } from "./pbeClient";
import { buscarInfoboxModelo } from "./wikipediaVeiculoInfobox";
import type { ConnectorFetchResult, ImportConnector } from "./types";

/**
 * Combina duas fontes reais e públicas para popular VERSÕES de veículo
 * sem inventar nenhum campo:
 *
 * - PBE Veicular (INMETRO, PDF oficial do governo): marca, modelo, versão,
 *   motor, tipo de propulsão, transmissão e combustível reais de cada
 *   versão vendida no Brasil.
 * - Infobox "Info/Automóvel" da Wikipédia PT (por modelo): carroceria,
 *   classe/segmento, tração e dimensões (entre-eixos/peso).
 *
 * `categoria` é obrigatória no schema (VehicleCategory) e o PBE não a
 * fornece — por isso, se a Wikipédia não confirmar a carroceria de um
 * modelo, TODAS as versões desse modelo são descartadas desta importação
 * em vez de receber uma categoria adivinhada.
 */

const TITLE_CASE_EXCEPTIONS = /\d/;

function toTitleCase(texto: string): string {
  return texto
    .split(" ")
    .map((palavra) =>
      TITLE_CASE_EXCEPTIONS.test(palavra)
        ? palavra
        : palavra.charAt(0) + palavra.slice(1).toLowerCase()
    )
    .join(" ");
}

function mapCombustivel(tipoPropulsao: string, combustivelCode: string): string | null {
  const tipo = tipoPropulsao.toLowerCase();
  if (tipo === "elétrico") return "Elétrico";
  if (tipo === "híbrido") return "Híbrido";
  switch (combustivelCode) {
    case "F":
      return "Flex";
    case "G":
      return "Gasolina";
    case "D":
      return "Diesel";
    default:
      return null;
  }
}

const TRANSMISSAO_PREFIXO_LABEL: Record<string, string> = {
  M: "Manual",
  A: "Automática",
  CVT: "CVT",
  MTA: "Automatizada",
  DCT: "Dupla Embreagem",
};

function mapTransmissao(codigo: string): { label: string; marchas: string } | null {
  const match = codigo.match(/^(M|A|CVT|MTA|DCT)-?(\d*)$/i);
  if (!match) return null;
  const label = TRANSMISSAO_PREFIXO_LABEL[match[1].toUpperCase()];
  if (!label) return null;
  return { label, marchas: match[2] ?? "" };
}

/**
 * Montadoras processadas nesta missão (ordem definida pelo usuário). Um
 * conector real registrado no painel de importação sempre pode ser
 * ampliado depois — bastando incluir mais nomes aqui — mas o escopo
 * inicial fica restrito a essas 10 para manter o tempo de execução (uma
 * consulta à Wikipédia por modelo distinto) previsível.
 */
export const MONTADORAS_ALVO = [
  "Fiat",
  "Volkswagen",
  "Chevrolet",
  "Toyota",
  "Honda",
  "Hyundai",
  "Jeep",
  "Renault",
  "Nissan",
  "BYD",
];

export async function fetchPbeVeicularRows(
  marcas: string[] = MONTADORAS_ALVO
): Promise<ConnectorFetchResult> {
  const montadoras = await listMontadoras();
  const nomesReais = montadoras.map((m) => m.name);

  const todasAsLinhas = await fetchPbeRows(nomesReais);
  const linhasAlvo = todasAsLinhas.filter((linha) =>
    marcas.some((marca) => marca.toLowerCase() === linha.marca.toLowerCase())
  );

  const infoboxCache = new Map<string, Awaited<ReturnType<typeof buscarInfoboxModelo>>>();
  const rows: Record<string, string>[] = [];

  for (const linha of linhasAlvo) {
    const modeloTitulo = toTitleCase(linha.modelo);
    const chave = `${linha.marca}|${modeloTitulo}`;
    if (!infoboxCache.has(chave)) {
      infoboxCache.set(chave, await buscarInfoboxModelo(linha.marca, modeloTitulo));
    }
    const infobox = infoboxCache.get(chave) ?? null;
    if (!infobox) continue;

    const combustivel = mapCombustivel(linha.tipoPropulsao, linha.combustivelCode);
    if (!combustivel) continue;

    const transmissao = mapTransmissao(linha.transmissao);

    rows.push({
      marca: linha.marca,
      modelo: modeloTitulo,
      versao: toTitleCase(linha.versao),
      anoInicial: String(PBE_TABLE_YEAR),
      anoFinal: String(PBE_TABLE_YEAR),
      motorizacao: linha.motor,
      combustivel,
      categoria: infobox.carroceria ?? "",
      segmento: infobox.segmento ?? "",
      tracao: infobox.tracao ?? "",
      transmissao: transmissao?.label ?? "",
      marchas: transmissao?.marchas ?? "",
      entreEixos: infobox.wheelbase ? String(infobox.wheelbase) : "",
      peso: infobox.weight ? String(infobox.weight) : "",
      pais: "Brasil",
      observacoes: `Fonte: INMETRO PBE Veicular ${PBE_TABLE_YEAR} (motor/transmissão/combustível) + Wikipédia (carroceria/tração/dimensões, ${infobox.sourceUrl}).`,
      status: "true",
    });
  }

  return {
    headers: [
      "marca",
      "modelo",
      "versao",
      "anoInicial",
      "anoFinal",
      "motorizacao",
      "combustivel",
      "categoria",
      "segmento",
      "tracao",
      "transmissao",
      "marchas",
      "entreEixos",
      "peso",
      "pais",
      "observacoes",
      "status",
    ],
    rows,
    collectedAt: new Date(),
    sourceVersion: `PBE Veicular ${PBE_TABLE_YEAR}`,
    sourceUrl: PBE_PDF_URL,
  };
}

export const pbeVeicularConnector: ImportConnector = {
  id: "pbe-veicular",
  label: "INMETRO PBE Veicular + Wikipédia (versões técnicas)",
  kind: "BASE_GOVERNAMENTAL",
  entity: "VEICULOS",
  description:
    "Cria/enriquece versões de veículo com motor, transmissão e combustível reais da tabela PBE Veicular do INMETRO (PDF oficial do governo, sem CSV/API disponível), cruzados com carroceria/tração/entre-eixos/peso do infobox da Wikipédia por modelo. Versões cuja carroceria não é confirmada pela Wikipédia são descartadas em vez de receberem uma categoria adivinhada. Restrito às montadoras já processadas nesta iniciativa (ver MONTADORAS_ALVO); requer o binário `pdftotext` (poppler/xpdf) no ambiente.",

  isConfigured(): boolean {
    return isPdftotextAvailable();
  },

  async fetchRows(): Promise<ConnectorFetchResult> {
    return fetchPbeVeicularRows();
  },
};
