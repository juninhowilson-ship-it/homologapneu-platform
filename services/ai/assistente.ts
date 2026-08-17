import "server-only";
import { buscarLivre } from "@/services/pesquisa";
import { getActiveProvider } from "@/lib/ai/providers/registry";
import type { ResultadoPesquisa } from "@/types/homologation";

export type MensagemAssistente = {
  autor: "usuario" | "assistente";
  texto: string;
};

export type RespostaAssistente = {
  resposta: string;
  totalFontes: number;
};

const MAX_FONTES = 8;
const MAX_HISTORICO = 6;

function formatarFonte(r: ResultadoPesquisa): string {
  const partes = [
    `${r.veiculoFabricante} ${r.veiculoModelo} ${r.veiculoVersao}`,
    `${r.veiculoAnoInicial}-${r.veiculoAnoFinal}`,
    `pneu ${r.pneuFabricante} ${r.pneuModelo} ${r.pneuMedida}`,
    `índices ${r.pneuIndiceCarga}/${r.pneuIndiceVelocidade}`,
    r.pneuTipo === "ORIGINAL" ? "original de fábrica" : r.pneuTipo.toLowerCase(),
    `homologação ${r.homologacaoCodigo} (${r.homologacaoAno})`,
  ];
  if (r.pressaoDianteira || r.pressaoTraseira) {
    partes.push(`pressões ${r.pressaoDianteira ?? "—"}/${r.pressaoTraseira ?? "—"}`);
  }
  return partes.join(" · ");
}

/**
 * Resposta determinística usada quando nenhum provedor de IA está
 * configurado: apresenta os dados encontrados sem gerar texto livre.
 */
function respostaDeterministica(fontes: ResultadoPesquisa[]): string {
  if (fontes.length === 0) {
    return (
      "Não encontrei registros homologados para essa consulta. " +
      "Tente informar o veículo (ex.: \"Corolla 2020\") ou uma medida " +
      "(ex.: \"225/45 R17\")."
    );
  }

  const linhas = fontes.slice(0, 5).map((f) => `• ${formatarFonte(f)}`);
  const extras =
    fontes.length > 5 ? `\n…e mais ${fontes.length - 5} registros na Pesquisa.` : "";

  return `Encontrei ${fontes.length} registro(s) homologado(s):\n${linhas.join("\n")}${extras}`;
}

const SYSTEM_PROMPT = [
  "Você é o assistente do HomologaPneu, plataforma brasileira de homologações de pneus.",
  "Responda em português do Brasil, de forma curta e objetiva.",
  "REGRA ABSOLUTA: responda APENAS com base nos DADOS HOMOLOGADOS fornecidos abaixo.",
  "Nunca invente medidas, índices, pressões ou compatibilidades que não estejam nos dados.",
  "Se os dados não cobrirem a pergunta, diga claramente que não há registro na base e sugira refinar a busca.",
  "Sempre que citar uma medida, inclua os índices de carga/velocidade e se é original de fábrica.",
  "Lembre o usuário de seguir o manual do proprietário quando a pergunta envolver segurança.",
].join(" ");

export async function responderAssistente(input: {
  pergunta: string;
  historico?: MensagemAssistente[];
  contexto?: string;
}): Promise<RespostaAssistente> {
  const pergunta = input.pergunta.trim();
  const termoBusca = [input.contexto, pergunta].filter(Boolean).join(" ");

  const fontes = (await buscarLivre(termoBusca)).slice(0, MAX_FONTES);
  const provider = getActiveProvider();

  if (!provider) {
    return {
      resposta: respostaDeterministica(fontes),
      totalFontes: fontes.length,
    };
  }

  const historico = (input.historico ?? [])
    .slice(-MAX_HISTORICO)
    .map((m) => `${m.autor === "usuario" ? "Usuário" : "Assistente"}: ${m.texto}`)
    .join("\n");

  const dados =
    fontes.length > 0
      ? fontes.map((f, i) => `${i + 1}. ${formatarFonte(f)}`).join("\n")
      : "(nenhum registro encontrado na base para esta consulta)";

  const prompt = [
    input.contexto ? `Contexto da página: ${input.contexto}` : null,
    historico ? `Conversa até aqui:\n${historico}` : null,
    `DADOS HOMOLOGADOS (única fonte permitida):\n${dados}`,
    `Pergunta do usuário: ${pergunta}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const resposta = await provider.complete({
      system: SYSTEM_PROMPT,
      prompt,
      maxTokens: 600,
    });
    return { resposta: resposta.trim(), totalFontes: fontes.length };
  } catch (error) {
    // Provedor indisponível não pode derrubar o assistente — cai para a
    // resposta determinística baseada nos mesmos dados.
    console.error("Assistente: falha no provedor de IA:", error);
    return {
      resposta: respostaDeterministica(fontes),
      totalFontes: fontes.length,
    };
  }
}
