import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Resolve DocumentUpload duplicados por SHA-256 (mesmo fileHash) — nascem
 * de corrida entre execuções automáticas do crawler que checaram "já
 * existe?" quase simultaneamente. Nunca apaga nada: mantém o upload mais
 * antigo como canônico, e nos demais:
 *   - rejeita os HomologationCandidate próprios (já existe equivalente no
 *     canônico — evita duplicar candidato pendente de revisão)
 *   - repõe qualquer FK (HomologationDocument/AuditLog) para o canônico
 *   - soft-delete (deletedAt + duplicateOfId), registro original preservado
 */
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const dupHashes: { fileHash: string }[] = await prisma.$queryRaw`
    SELECT "fileHash" FROM document_uploads WHERE "deletedAt" IS NULL
    GROUP BY "fileHash" HAVING count(*) > 1`;

  console.log(`Grupos de fileHash duplicado: ${dupHashes.length}`);
  let resolvedDocs = 0;
  let rejectedCandidates = 0;
  let repointedFks = 0;

  for (const { fileHash } of dupHashes) {
    const rows = await prisma.documentUpload.findMany({
      where: { fileHash, deletedAt: null },
      orderBy: { uploadedAt: "asc" },
    });
    const [canonical, ...duplicates] = rows;
    console.log(`\nfileHash ${fileHash.slice(0, 12)}...: canônico #${canonical.id}, duplicatas: ${duplicates.map((d) => `#${d.id}`).join(", ")}`);

    for (const dup of duplicates) {
      const candidateResult = await prisma.homologationCandidate.updateMany({
        where: { documentUploadId: dup.id, status: "PENDENTE_REVISAO" },
        data: {
          status: "REJEITADA",
          reviewNotes: `Rejeitado automaticamente: documento #${dup.id} é duplicata (mesmo SHA-256) de #${canonical.id}, que já tem o candidato equivalente.`,
          reviewedAt: new Date(),
        },
      });
      rejectedCandidates += candidateResult.count;

      const homDocsResult = await prisma.homologationDocument.updateMany({
        where: { documentUploadId: dup.id },
        data: { documentUploadId: canonical.id },
      });
      const auditResult = await prisma.auditLog.updateMany({
        where: { documentUploadId: dup.id },
        data: { documentUploadId: canonical.id },
      });
      repointedFks += homDocsResult.count + auditResult.count;

      await prisma.documentUpload.update({
        where: { id: dup.id },
        data: { deletedAt: new Date(), duplicateOfId: canonical.id },
      });

      await prisma.auditLog.create({
        data: {
          entity: "DocumentUpload",
          entityId: dup.id,
          action: "UPDATE",
          changes: JSON.stringify({ acao: "resolucao-duplicata", canonicalId: canonical.id, candidatosRejeitados: candidateResult.count }),
        },
      });

      resolvedDocs++;
      console.log(`  #${dup.id}: ${candidateResult.count} candidato(s) rejeitado(s), soft-delete aplicado.`);
    }
  }

  console.log(`\n=== Resumo: ${resolvedDocs} documento(s) duplicado(s) resolvido(s), ${rejectedCandidates} candidato(s) rejeitado(s), ${repointedFks} FK(s) repontada(s). ===`);
}

main()
  .catch((e) => { console.error("Falha:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
