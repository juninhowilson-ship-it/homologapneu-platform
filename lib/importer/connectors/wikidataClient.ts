import "server-only";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

export type SparqlBinding = Record<string, { type: string; value: string; "xml:lang"?: string }>;

/**
 * Executa uma consulta SPARQL contra o Wikidata Query Service (publico,
 * sem autenticacao). Usa POST para evitar limites de tamanho de URL ao
 * consultar muitos nomes de uma vez via VALUES.
 */
export async function sparqlQuery(query: string): Promise<SparqlBinding[]> {
  const response = await fetch(SPARQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/sparql-results+json",
      "User-Agent": "HomologaPneu-DataImport/1.0 (https://github.com/homologapneu)",
    },
    body: `query=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar o Wikidata: HTTP ${response.status}`);
  }

  const json = (await response.json()) as {
    results: { bindings: SparqlBinding[] };
  };
  return json.results.bindings;
}

/** Escapa um valor para uso seguro dentro de uma clausula VALUES em SPARQL. */
export function sparqlStringLiteral(value: string): string {
  return JSON.stringify(value);
}

/** Divide uma lista em lotes menores, para manter cada consulta SPARQL enxuta. */
export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
