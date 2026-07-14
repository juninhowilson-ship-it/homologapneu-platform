import "server-only";
import { listMontadoras } from "@/repositories/montadoras";
import { sparqlQuery, sparqlStringLiteral, chunk } from "./wikidataClient";
import { politeFetch } from "./scraperClient";
import type { ConnectorFetchResult, ImportConnector } from "./types";

const BATCH_SIZE = 40;
const AUTOMOBILE_MANUFACTURER_CLASS = "wd:Q786820";
const MAX_NOTE_LENGTH = 900;

function buildSitelinkQuery(names: string[]): string {
  const values = names.map(sparqlStringLiteral).join(" ");
  return `
SELECT DISTINCT ?nameIn ?article WHERE {
  VALUES ?nameIn { ${values} }
  ?item rdfs:label ?rawLabel .
  FILTER(STR(?rawLabel) = ?nameIn)
  ?item wdt:P31/wdt:P279* ${AUTOMOBILE_MANUFACTURER_CLASS} .
  ?article schema:about ?item ;
           schema:isPartOf <https://pt.wikipedia.org/> .
}`;
}

type WikipediaSummary = { extract?: string; content_urls?: { desktop?: { page?: string } } };

async function fetchSummary(articleTitle: string): Promise<WikipediaSummary | null> {
  const url = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`;
  const response = await politeFetch(url, { headers: { Accept: "application/json" } }, 500);
  if (!response.ok) return null;
  return (await response.json()) as WikipediaSummary;
}

/**
 * Conector de enriquecimento: para cada montadora já cadastrada, usa o
 * MESMO critério de correspondência exata já validado pelo
 * wikidata-montadoras (classe "automobile manufacturer", rótulo exato) para
 * obter o link confirmado da Wikipédia em português a partir do próprio
 * Wikidata — evita qualquer ambiguidade nova de busca por nome — e então
 * consulta a API pública da Wikipédia (REST, sem autenticação) para trazer
 * um resumo real e citável, usado para preencher `notes` quando vazio ou
 * apenas com uma anotação genérica.
 */
export const wikipediaMontadorasConnector: ImportConnector = {
  id: "wikipedia-montadoras",
  label: "Wikipédia — Montadoras (enriquecimento)",
  kind: "API_PUBLICA",
  entity: "MONTADORAS",
  description:
    "Enriquece as montadoras já cadastradas com um resumo descritivo real da Wikipédia em português, localizado via o sitelink confirmado no Wikidata (mesma correspondência exata usada pelo conector wikidata-montadoras). Não requer credenciais.",

  isConfigured(): boolean {
    return true;
  },

  async fetchRows(): Promise<ConnectorFetchResult> {
    const montadoras = await listMontadoras();
    const names = montadoras.map((m) => m.name);

    const articleByName = new Map<string, string>();
    for (const batch of chunk(names, BATCH_SIZE)) {
      const bindings = await sparqlQuery(buildSitelinkQuery(batch));
      for (const binding of bindings) {
        const name = binding.nameIn?.value;
        const articleUrl = binding.article?.value;
        if (!name || !articleUrl || articleByName.has(name)) continue;
        const title = decodeURIComponent(articleUrl.split("/wiki/")[1] ?? "");
        if (title) articleByName.set(name, title);
      }
    }

    const rows: Record<string, string>[] = [];
    for (const [nome, title] of articleByName.entries()) {
      const summary = await fetchSummary(title);
      const extract = summary?.extract?.trim();
      if (!extract) continue;

      rows.push({
        nome,
        observacoes: extract.slice(0, MAX_NOTE_LENGTH),
        status: "true",
        // Sitelink confirmado no Wikidata (mesma entidade do
        // wikidata-montadoras) + resumo textual da Wikipedia.
        confianca: "70",
      });
    }

    return {
      headers: ["nome", "observacoes", "status", "confianca"],
      rows,
      collectedAt: new Date(),
      sourceUrl: "https://pt.wikipedia.org/api/rest_v1/page/summary/",
    };
  },
};
