"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import { useMedia, type MediaQuery } from "@/hooks/useMedia";
import MediaFiltros from "./MediaFiltros";
import MediaGrid from "./MediaGrid";
import MediaUploadModal from "./MediaUploadModal";
import MediaPreviewModal from "./MediaPreviewModal";
import type { MediaDTO } from "@/lib/media/types";

const PAGE_SIZE = 24;

export default function MidiaContainer() {
  const [filtros, setFiltros] = useState<MediaQuery>({ page: 1, pageSize: PAGE_SIZE });
  const [uploadAberto, setUploadAberto] = useState(false);
  const [selecionada, setSelecionada] = useState<MediaDTO | null>(null);

  const { data, isLoading, isError } = useMedia(filtros);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <MediaFiltros filtros={filtros} onChange={setFiltros} />
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={() => setUploadAberto(true)}>
          <Upload size={16} className="mr-2 inline" />
          Enviar imagem
        </Button>
      </div>

      <MediaGrid
        itens={data?.data ?? []}
        carregando={isLoading}
        erro={isError}
        onSelect={setSelecionada}
      />

      {data && data.total > 0 && (
        <Pagination
          page={filtros.page}
          pageSize={filtros.pageSize}
          total={data.total}
          onPageChange={(page) => setFiltros((prev) => ({ ...prev, page }))}
        />
      )}

      <MediaUploadModal open={uploadAberto} onClose={() => setUploadAberto(false)} />
      <MediaPreviewModal media={selecionada} onClose={() => setSelecionada(null)} />
    </div>
  );
}
