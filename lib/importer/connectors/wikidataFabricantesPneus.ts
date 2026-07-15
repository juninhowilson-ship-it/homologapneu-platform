import "server-only";
import { listTireManufacturers } from "@/repositories/pneus";
import { sparqlQuery, sparqlStringLiteral, chunk } from "./wikidataClient";
import type { ConnectorFetchResult, ImportConnector } from "./types";

const BATCH_SIZE = 40;

// Q169545 = "tire" no Wikidata. Empresas cujo P1056 (produto/material
// produzido) inclui esse item sao fabricantes de pneus.
const TIRE_PRODUCT = "wd:Q169545";

function buildQuery(names: string[]): string {
  const values = names.map(sparqlStringLiteral).join(" ");
  return `
SELECT ?nameIn ?countryLabel ?website ?logo WHERE {
  VALUES ?nameIn { ${values} }
  ?item rdfs:label ?rawLabel .
  FILTER(STR(?rawLabel) = ?nameIn)
  ?item wdt:P1056 ${TIRE_PRODUCT} .
  OPTIONAL { ?item wdt:P17 ?country . }
  OPTIONAL { ?item wdt:P856 ?website . }
  OPTIONAL { ?item wdt:P154 ?logo . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
}`;
}

type Enrichment = {
  country?: string;
  website?: string;
  logo?: string;
};

/**
 * Conector de enriquecimento: consulta o Wikidata pelo nome exato de cada
 * fabricante de pneus já cadastrado, filtrando por empresas que produzem
 * pneus (propriedade P1056 = "produto ou material produzido" = "tire"),
 * trazendo país de origem, site oficial e logotipo.
 *
 * A cobertura do Wikidata para fabricantes de pneus é mais esparsa que
 * para montadoras de veículos — nem toda marca conhecida está corretamente
 * classificada lá. Marcas sem correspondência exata simplesmente não
 * geram linha (nenhum dado é inventado); o cadastro permanece como
 * estava, aguardando uma fonte melhor.
 */
export const wikidataFabricantesPneusConnector: ImportConnector = {
  id: "wikidata-fabricantes-pneus",
  label: "Wikidata — Fabricantes de Pneus (enriquecimento)",
  kind: "API_PUBLICA",
  sourceUrl: "https://query.wikidata.org/sparql",
  entity: "FABRICANTES_PNEUS",
  description:
    "Enriquece os fabricantes de pneus já cadastrados com país de origem, site oficial e logotipo, via consulta SPARQL pública ao Wikidata (empresas que produzem pneus). Não requer credenciais.",

  isConfigured(): boolean {
    return true;
  },

  async fetchRows(): Promise<ConnectorFetchResult> {
    const fabricantes = await listTireManufacturers();
    const names = fabricantes.map((f) => f.name);

    const enrichmentByName = new Map<string, Enrichment>();

    for (const batch of chunk(names, BATCH_SIZE)) {
      const bindings = await sparqlQuery(buildQuery(batch));
      for (const binding of bindings) {
        const name = binding.nameIn?.value;
        if (!name || enrichmentByName.has(name)) continue;
        enrichmentByName.set(name, {
          country: binding.countryLabel?.value,
          website: binding.website?.value,
          logo: binding.logo?.value,
        });
      }
    }

    const rows = Array.from(enrichmentByName.entries())
      .filter(([, info]) => info.country || info.website)
      .map(([nome, info]) => ({
        nome,
        pais: info.country ?? "",
        site: info.website ?? "",
        logo: info.logo ?? "",
        status: "true",
        // Correspondencia exata por nome + filtro de produto "tire" (P1056).
        confianca: "75",
      }));

    return {
      headers: ["nome", "pais", "site", "logo", "status", "confianca"],
      rows,
      collectedAt: new Date(),
      sourceUrl: "https://query.wikidata.org/sparql",
    };
  },
};
