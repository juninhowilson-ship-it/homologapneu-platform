import "server-only";
import { listMontadoras } from "@/repositories/montadoras";
import { sparqlQuery, sparqlStringLiteral, chunk } from "./wikidataClient";
import type { ConnectorFetchResult, ImportConnector } from "./types";

const BATCH_SIZE = 40;

// Q786820 = "automobile manufacturer" no Wikidata.
const AUTOMOBILE_MANUFACTURER_CLASS = "wd:Q786820";

function buildQuery(names: string[]): string {
  const values = names.map(sparqlStringLiteral).join(" ");
  return `
SELECT ?nameIn ?countryLabel ?website ?logo ?parentLabel WHERE {
  VALUES ?nameIn { ${values} }
  ?item rdfs:label ?rawLabel .
  FILTER(STR(?rawLabel) = ?nameIn)
  ?item wdt:P31/wdt:P279* ${AUTOMOBILE_MANUFACTURER_CLASS} .
  OPTIONAL { ?item wdt:P17 ?country . }
  OPTIONAL { ?item wdt:P856 ?website . }
  OPTIONAL { ?item wdt:P154 ?logo . }
  OPTIONAL { ?item wdt:P749 ?parent . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
}`;
}

type Enrichment = {
  country?: string;
  website?: string;
  logo?: string;
  group?: string;
};

/**
 * Conector de enriquecimento: consulta o Wikidata (base publica, aberta,
 * estruturada) pelo nome exato de cada montadora ja cadastrada e traz
 * pais de origem, site oficial, logotipo e grupo automotivo — dados que a
 * FIPE (usada para a lista de nomes) nao fornece.
 *
 * So aceita correspondencia por rotulo EXATO (case-sensitive) com uma
 * entidade classificada como "automobile manufacturer" no Wikidata.
 * Quando uma montadora tem multiplos valores concorrentes (ex.: varios
 * sites regionais), o primeiro retornado e usado — por isso o registro
 * permanece "Necessita Validacao" apos o enriquecimento.
 */
export const wikidataMontadorasConnector: ImportConnector = {
  id: "wikidata-montadoras",
  label: "Wikidata — Montadoras (enriquecimento)",
  kind: "API_PUBLICA",
  entity: "MONTADORAS",
  description:
    "Enriquece as montadoras já cadastradas com país de origem, site oficial, logotipo e grupo automotivo, via consulta SPARQL pública ao Wikidata. Não requer credenciais.",

  isConfigured(): boolean {
    return true;
  },

  async fetchRows(): Promise<ConnectorFetchResult> {
    const montadoras = await listMontadoras();
    const names = montadoras.map((m) => m.name);

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
          group: binding.parentLabel?.value,
        });
      }
    }

    const rows = Array.from(enrichmentByName.entries())
      .filter(([, info]) => info.country || info.website || info.group)
      .map(([nome, info]) => ({
        nome,
        pais: info.country ?? "",
        site: info.website ?? "",
        grupo: info.group ?? "",
        logo: info.logo ?? "",
        status: "true",
        // Correspondencia exata de rotulo + classe restrita, mas com risco
        // conhecido de propriedades multivaloradas (ver comentario acima).
        confianca: "75",
      }));

    return {
      headers: ["nome", "pais", "site", "grupo", "logo", "status", "confianca"],
      rows,
      collectedAt: new Date(),
      sourceUrl: "https://query.wikidata.org/sparql",
    };
  },
};
