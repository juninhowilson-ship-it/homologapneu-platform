/**
 * Sincroniza o catálogo COMERCIAL de pneus do Intelli Tire (ERP irmão) para
 * a tabela de referência `commercial_tire_offers` do HomologaPneu.
 *
 * Responde "este pneu existe e ainda gira no mercado?" — pergunta distinta
 * de "é homologado". Um SKU de varejo NUNCA vira homologação: fica em
 * tabela própria, exibido como disponibilidade comercial.
 *
 * Uso:
 *   INTELLI_TIRE_DATABASE_URL="postgresql://..." npm run sync:comercial
 *
 * Só traz as medidas que aparecem em homologações do HomologaPneu — não
 * copia o ERP inteiro, apenas o que o produto usa.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Client } from "pg";

const JANELA_MESES = 12;
const TOP_POR_MEDIDA = 8;

type LinhaErp = {
  marca: string;
  medida: string;
  descricao: string;
  vendas: number;
};

/** "PNEU 225/45R18 91W BRIDGESTONE TURANZA T005 MOE RUNFLAT" → partes. */
function extrair(linha: LinhaErp) {
  const descricao = linha.descricao.toUpperCase();
  const posMarca = descricao.indexOf(linha.marca);

  const modeloBruto =
    posMarca === -1
      ? null
      : descricao
          .slice(posMarca + linha.marca.length)
          .replace(/\s*(MOE|MO|AO|RO1|K1|N0|N1|N2)?\s*RUN\s?FLAT.*$/i, "")
          .replace(/\s*\([^)]*\)\s*/g, " ")
          .trim();

  const indices = descricao.match(/\b(\d{2,3})\s?([A-Z])\b/);
  const oe = descricao.match(/\b(MOE|MO1|MO|AO|RO1|K1|N0|N1|N2)\b/);

  return {
    model: modeloBruto && modeloBruto.length > 0 ? modeloBruto.slice(0, 60) : null,
    loadIndex: indices?.[1] ?? null,
    speedIndex: indices?.[2] ?? null,
    oeMarking: oe?.[1] ?? null,
    runFlat: /RUN\s?FLAT/i.test(descricao),
  };
}

async function main() {
  const erpUrl = process.env.INTELLI_TIRE_DATABASE_URL;
  if (!erpUrl) {
    throw new Error(
      "Configure INTELLI_TIRE_DATABASE_URL com a conexão do banco do Intelli Tire."
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }),
  });
  const erp = new Client({ connectionString: erpUrl });
  await erp.connect();

  try {
    // 1. Medidas que o HomologaPneu realmente usa
    const medidas = await prisma.tire.findMany({
      where: { deletedAt: null, homologationTires: { some: {} } },
      select: { size: true },
      distinct: ["size"],
    });
    const tamanhos = medidas.map((m) => m.size.toUpperCase());
    console.log(`Medidas com homologação no HomologaPneu: ${tamanhos.length}`);

    // 2. Catálogo comercial vendido na janela, só nessas medidas
    const { rows } = await erp.query<LinhaErp>(
      `SELECT upper(trim(ma.nome)) AS marca,
              upper(trim(me.descricao)) AS medida,
              upper(trim(p.descricao)) AS descricao,
              (SELECT count(*)::int FROM app.itens_venda iv
                 JOIN app.vendas v ON v.id = iv.venda_id
                WHERE iv.produto_id = p.id
                  AND v.data_venda >= (CURRENT_DATE - ($2 || ' months')::interval)) AS vendas
         FROM app.produtos p
         JOIN app.modelos mo ON mo.id = p.modelo_id
         JOIN app.marcas ma ON ma.id = mo.marca_id
         JOIN app.medidas me ON me.id = p.medida_id
        WHERE p.deleted_at IS NULL
          AND upper(trim(me.descricao)) = ANY($1::text[])`,
      [tamanhos, JANELA_MESES]
    );
    console.log(`SKUs encontrados no Intelli Tire: ${rows.length}`);

    // 3. Extrai, filtra os que venderam e mantém os mais vendidos por medida
    const porMedida = new Map<string, (LinhaErp & ReturnType<typeof extrair>)[]>();
    for (const linha of rows) {
      if (linha.vendas <= 0) continue;
      const extraido = extrair(linha);
      if (!extraido.model) continue;

      const lista = porMedida.get(linha.medida) ?? [];
      lista.push({ ...linha, ...extraido });
      porMedida.set(linha.medida, lista);
    }

    const source = `Intelli Tire — vendas dos últimos ${JANELA_MESES} meses`;
    let gravados = 0;

    for (const [medida, lista] of porMedida) {
      const top = lista
        .sort((a, b) => b.vendas - a.vendas)
        .slice(0, TOP_POR_MEDIDA);

      for (const item of top) {
        await prisma.commercialTireOffer.upsert({
          where: {
            brand_model_size_oeMarking: {
              brand: item.marca,
              model: item.model!,
              size: medida,
              oeMarking: item.oeMarking ?? "",
            },
          },
          create: {
            brand: item.marca,
            model: item.model!,
            size: medida,
            loadIndex: item.loadIndex,
            speedIndex: item.speedIndex,
            oeMarking: item.oeMarking,
            runFlat: item.runFlat,
            rawDescription: item.descricao.slice(0, 200),
            soldUnits: item.vendas,
            source,
          },
          update: {
            soldUnits: item.vendas,
            rawDescription: item.descricao.slice(0, 200),
            syncedAt: new Date(),
            source,
          },
        });
        gravados++;
      }
    }

    console.log(`Ofertas sincronizadas: ${gravados}`);
  } finally {
    await erp.end();
    await prisma.$disconnect();
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
