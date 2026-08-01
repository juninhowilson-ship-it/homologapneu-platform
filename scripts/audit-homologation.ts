import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/** npm run audit:homologation — regras de negócio específicas de homologação
 * (além dos checks genéricos de integridade em audit:database). */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this);
};

type Finding = { check: string; count: number; sample: unknown[] };
const findings: Finding[] = [];
function report(check: string, rows: unknown[]) {
  findings.push({ check, count: rows.length, sample: rows.slice(0, 10) });
}

async function main() {
  console.log("=== Auditoria de Homologações ===\n");

  // Toda homologação real deveria ter pelo menos um pneu ORIGINAL (o que
  // veio de fábrica) — sem isso, só tem opcionais/substitutos, o que é
  // estruturalmente estranho para uma homologação "fechada".
  const semOriginal = await prisma.homologation.findMany({
    where: { tires: { none: { role: "ORIGINAL" } } },
    select: { id: true, code: true },
  });
  report("Homologation sem nenhum pneu ORIGINAL", semOriginal);

  // Código OE vinculado a uma montadora diferente da montadora real do
  // veículo da homologação — inconsistência real de dado, nunca deveria
  // acontecer (ex.: código OE da Honda num carro Toyota).
  const oeErrado: unknown[] = await prisma.$queryRaw`
    SELECT ht.id as "homologationTireId", h.code, oc."vehicleManufacturerId" as "oeManufacturerId", vm."manufacturerId" as "veiculoManufacturerId"
    FROM homologation_tires ht
    JOIN homologations h ON h.id = ht."homologationId"
    JOIN vehicle_versions vv ON vv.id = h."vehicleVersionId"
    JOIN vehicle_models vm ON vm.id = vv."vehicleModelId"
    JOIN oe_codes oc ON oc.id = ht."oeCodeId"
    WHERE oc."vehicleManufacturerId" != vm."manufacturerId"`;
  report("Código OE de montadora diferente da montadora do veículo", oeErrado);

  // Duas homologações para a mesma versão de veículo com o mesmo ano —
  // não é duplicidade de registro (@@unique já cobre code+versão), mas
  // pode indicar o mesmo ano-modelo homologado duas vezes com códigos
  // diferentes — vale revisão humana, não é bloqueante.
  const mesmoAnoDuplicado: unknown[] = await prisma.$queryRaw`
    SELECT "vehicleVersionId", year, count(*) as total
    FROM homologations WHERE "deletedAt" IS NULL
    GROUP BY "vehicleVersionId", year HAVING count(*) > 1`;
  report("Mesma versão+ano com mais de uma homologação (revisar, não é erro automático)", mesmoAnoDuplicado);

  // Pressão recomendada sem nenhum valor real preenchido (linha "vazia")
  const pressaoVazia = await prisma.vehiclePressureSpec.findMany({
    where: {
      emptyFront: null,
      emptyRear: null,
      partialLoadFront: null,
      partialLoadRear: null,
      fullLoadFront: null,
      fullLoadRear: null,
    },
    select: { id: true, homologationId: true },
  });
  report("VehiclePressureSpec sem nenhum valor de pressão preenchido", pressaoVazia);

  // Distribuição por status de validação (informativo)
  const porStatus: unknown[] = await prisma.$queryRaw`
    SELECT "validationStatus", count(*) FROM homologations WHERE "deletedAt" IS NULL GROUP BY "validationStatus"`;
  console.log("Distribuição por validationStatus:", JSON.stringify(porStatus));

  let hasProblems = false;
  for (const f of findings) {
    const status = f.count === 0 ? "OK" : "ATENÇÃO";
    if (f.count > 0 && !f.check.includes("revisar, não é erro")) hasProblems = true;
    console.log(`[${status}] ${f.check}: ${f.count}`);
    if (f.count > 0) console.log("  amostra:", JSON.stringify(f.sample));
  }

  console.log(hasProblems ? "\nAuditoria de homologações encontrou inconsistências reais." : "\nAuditoria de homologações limpa.");
  process.exitCode = hasProblems ? 1 : 0;
}

main()
  .catch((e) => { console.error("Falha:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
