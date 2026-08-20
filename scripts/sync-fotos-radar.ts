/**
 * Traz as fotos de veículo do Radar Automotivo SP (projeto irmão) para as
 * versões 2020+ do HomologaPneu.
 *
 * O Radar guarda uma foto por TERMO DE MODELO (`dim_modelo_imagem`), não por
 * versão. Então a foto é ilustrativa do modelo: um Corolla XEi e um Corolla
 * GLi recebem a mesma imagem. A UI rotula "Foto ilustrativa" por causa disso.
 *
 * O vínculo é CURADO à mão, não inferido por semelhança de nome. Casar só
 * pelo nome do modelo cola foto errada: o `X4` do HomologaPneu é um JAC, e o
 * `X4` do Radar é um BMW. Por isso o mapa abaixo fixa marca + modelo, e
 * termos cuja foto o próprio Radar marca como de outra geração ficam de fora
 * (ver EXCLUIDOS).
 *
 * Uso:
 *   RADAR_DATABASE_URL="postgresql://..." npm run sync:fotos
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Client } from "pg";
import { ANO_MINIMO_PADRAO } from "../lib/medida";

type Vinculo = {
  /** Marca como está em `manufacturers.name` do HomologaPneu. */
  marca: string;
  /** Modelo como está em `vehicle_models.name` do HomologaPneu. */
  modelo: string;
  /** `termo_modelo` em `dim_modelo_imagem` do Radar. */
  termo: string;
  /** Ângulo da foto — o Radar não normaliza, então vem conferido daqui. */
  tipo: "PRINCIPAL" | "TRASEIRA";
};

const VINCULOS: Vinculo[] = [
  { marca: "BMW", modelo: "X1", termo: "X1 S20I", tipo: "PRINCIPAL" },
  { marca: "Chevrolet", modelo: "Montana", termo: "MONTANA", tipo: "PRINCIPAL" },
  { marca: "Chevrolet", modelo: "Onix", termo: "ONIX", tipo: "PRINCIPAL" },
  { marca: "Chevrolet", modelo: "Onix Plus", termo: "ONIX PLUS", tipo: "PRINCIPAL" },
  { marca: "Chevrolet", modelo: "Spin", termo: "SPIN", tipo: "PRINCIPAL" },
  { marca: "Chevrolet", modelo: "Tracker", termo: "TRACKER", tipo: "PRINCIPAL" },
  { marca: "Fiat", modelo: "Argo", termo: "ARGO", tipo: "PRINCIPAL" },
  { marca: "Fiat", modelo: "Fastback", termo: "FASTBACK", tipo: "PRINCIPAL" },
  { marca: "Fiat", modelo: "Fiorino", termo: "FIORINO", tipo: "PRINCIPAL" },
  { marca: "Fiat", modelo: "Mobi", termo: "MOBI", tipo: "PRINCIPAL" },
  { marca: "Fiat", modelo: "Strada", termo: "STRADA", tipo: "PRINCIPAL" },
  { marca: "Fiat", modelo: "Toro", termo: "TORO", tipo: "PRINCIPAL" },
  { marca: "Ford", modelo: "RANGER", termo: "RANGER", tipo: "PRINCIPAL" },
  { marca: "Honda", modelo: "Civic", termo: "CIVIC", tipo: "PRINCIPAL" },
  { marca: "Honda", modelo: "HR-V", termo: "HR-V", tipo: "PRINCIPAL" },
  { marca: "Hyundai", modelo: "Creta", termo: "CRETA", tipo: "PRINCIPAL" },
  { marca: "Hyundai", modelo: "HB20", termo: "HB20", tipo: "PRINCIPAL" },
  { marca: "Jeep", modelo: "Renegade", termo: "RENEGADE", tipo: "PRINCIPAL" },
  { marca: "Nissan", modelo: "Frontier", termo: "FRONTIER", tipo: "PRINCIPAL" },
  { marca: "Nissan", modelo: "Kicks", termo: "KICKS", tipo: "PRINCIPAL" },
  { marca: "Peugeot", modelo: "208", termo: "208", tipo: "PRINCIPAL" },
  { marca: "Porsche", modelo: "Macan", termo: "MACAN", tipo: "PRINCIPAL" },
  { marca: "Renault", modelo: "DUSTER", termo: "DUSTER", tipo: "PRINCIPAL" },
  { marca: "Renault", modelo: "Kardian", termo: "KARDIAN", tipo: "PRINCIPAL" },
  { marca: "Toyota", modelo: "Corolla", termo: "COROLLA", tipo: "PRINCIPAL" },
  { marca: "Toyota", modelo: "Corolla Cross", termo: "CCROSS", tipo: "PRINCIPAL" },
  { marca: "Toyota", modelo: "RAV4", termo: "RAV4", tipo: "PRINCIPAL" },
  { marca: "Toyota", modelo: "Yaris", termo: "YARIS", tipo: "PRINCIPAL" },
  { marca: "Volkswagen", modelo: "Polo", termo: "POLO", tipo: "PRINCIPAL" },
  { marca: "Volkswagen", modelo: "T-Cross", termo: "T CROSS", tipo: "PRINCIPAL" },
  { marca: "Volkswagen", modelo: "Virtus", termo: "VIRTUS", tipo: "PRINCIPAL" },

  // Fotos que o Radar tem só de traseira — entram como TRASEIRA para não
  // virarem a imagem de capa do veículo.
  { marca: "Fiat", modelo: "Pulse", termo: "PULSE", tipo: "TRASEIRA" },
  { marca: "Renault", modelo: "Kwid", termo: "KWID", tipo: "TRASEIRA" },
  { marca: "Renault", modelo: "LOGAN", termo: "LOGAN", tipo: "TRASEIRA" },
];

/**
 * Termos que o Radar tem mas que NÃO devem ser usados, com o motivo. Ficam
 * registrados para ninguém "consertar" a ausência sem saber por quê.
 */
const EXCLUIDOS: Record<string, string> = {
  CAYENNE: "foto é da geração 92A (2010-2011); os Cayenne aqui são 2020+",
  UNO: "foto é de um Uno 1992; os Uno aqui são 2020+",
  CITY: "foto é do City 2013, geração anterior à vendida de 2020 em diante",
  "WR-V": "foto é da 1ª geração; o WR-V aqui é a 2ª",
  VERSA: "o próprio crédito marca a geração como aproximada",
  X4: "o X4 do HomologaPneu é um JAC, o do Radar é um BMW",
  AMAROK: "os modelos Amarok aqui estão cadastrados com nome malformado",
};

const FONTE = "Radar Automotivo SP";

async function main() {
  const radarUrl = process.env.RADAR_DATABASE_URL;
  if (!radarUrl) {
    throw new Error(
      "Configure RADAR_DATABASE_URL com a conexão do banco do Radar Automotivo SP."
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }),
  });
  const radar = new Client({ connectionString: radarUrl });
  await radar.connect();

  try {
    const termos = VINCULOS.map((v) => v.termo);
    const { rows } = await radar.query<{
      termo_modelo: string;
      url: string;
      credito: string | null;
    }>(
      `SELECT termo_modelo, url, credito
         FROM dim_modelo_imagem
        WHERE termo_modelo = ANY($1::text[])`,
      [termos]
    );

    const porTermo = new Map(rows.map((r) => [r.termo_modelo, r]));
    console.log(`Fotos encontradas no Radar: ${porTermo.size}/${termos.length}`);
    console.log(`Termos ignorados de propósito: ${Object.keys(EXCLUIDOS).length}`);

    let gravadas = 0;
    let semFoto = 0;

    for (const vinculo of VINCULOS) {
      const foto = porTermo.get(vinculo.termo);
      if (!foto) {
        console.warn(`  sem foto no Radar para "${vinculo.termo}" — pulando`);
        semFoto++;
        continue;
      }

      const versoes = await prisma.vehicleVersion.findMany({
        where: {
          yearEnd: { gte: ANO_MINIMO_PADRAO },
          vehicleModel: {
            name: { equals: vinculo.modelo, mode: "insensitive" },
            manufacturer: {
              name: { equals: vinculo.marca, mode: "insensitive" },
            },
          },
        },
        select: { id: true },
      });

      for (const versao of versoes) {
        await prisma.vehicleImage.upsert({
          where: {
            vehicleVersionId_type: {
              vehicleVersionId: versao.id,
              type: vinculo.tipo,
            },
          },
          create: {
            vehicleVersionId: versao.id,
            type: vinculo.tipo,
            url: foto.url,
            credit: foto.credito,
            source: FONTE,
          },
          // Só reescreve o que veio desta fonte: foto cadastrada à mão vence.
          update: {},
        });
        gravadas++;
      }

      console.log(
        `  ${vinculo.marca} ${vinculo.modelo}: ${versoes.length} versões`
      );
    }

    console.log(`\nVínculos gravados: ${gravadas}`);
    if (semFoto > 0) {
      console.log(`Vínculos sem foto correspondente no Radar: ${semFoto}`);
    }
  } finally {
    await radar.end();
    await prisma.$disconnect();
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
