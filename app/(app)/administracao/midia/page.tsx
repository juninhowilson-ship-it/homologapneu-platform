import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import MidiaContainer from "@/components/administracao/midia/MidiaContainer";
import { contarMedia } from "@/repositories/media/media";
import { isMediaStorageConfigured } from "@/storage/mediaStorage";
import { MEDIA_STATUS_LABELS } from "@/components/administracao/midia/mediaLabels";
import type { MediaStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function BibliotecaDeImagensPage() {
  const [contadores, storageConfigurado] = await Promise.all([
    contarMedia(),
    Promise.resolve(isMediaStorageConfigured()),
  ]);

  return (
    <main className="space-y-8 p-10">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold">Biblioteca de Imagens</h1>
          <Badge tone="warning">Somente admin</Badge>
        </div>
        <p className="mt-2 text-muted-foreground">
          HomologaPneu Media Manager — logos, fotos de veículos/pneus/rodas
          e etiquetas INMETRO, com armazenamento, cache, compressão e
          relacionamento automático com o Banco Mestre.
        </p>

        {!storageConfigurado && (
          <p className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
            Supabase Storage ainda não configurado (SUPABASE_URL /
            SUPABASE_SERVICE_ROLE_KEY). A infraestrutura está pronta;
            uploads reais vão falhar até essas variáveis serem definidas.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-6">
        <Card>
          <h3 className="text-muted-foreground">Total de mídias</h3>
          <p className="mt-3 text-4xl font-bold">{contadores.total}</p>
        </Card>
        {(Object.keys(MEDIA_STATUS_LABELS) as MediaStatus[]).map((status) => (
          <Card key={status}>
            <h3 className="text-muted-foreground">{MEDIA_STATUS_LABELS[status]}</h3>
            <p className="mt-3 text-4xl font-bold">{contadores.porStatus[status] ?? 0}</p>
          </Card>
        ))}
      </div>

      <MidiaContainer />
    </main>
  );
}
