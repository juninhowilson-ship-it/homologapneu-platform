import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import MediaCard from "./MediaCard";
import type { MediaDTO } from "@/lib/media/types";

type Props = {
  itens: MediaDTO[];
  carregando: boolean;
  erro: boolean;
  onSelect: (media: MediaDTO) => void;
};

export default function MediaGrid({ itens, carregando, erro, onSelect }: Props) {
  if (carregando) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    );
  }

  if (erro) {
    return (
      <EmptyState
        title="Erro ao carregar a biblioteca"
        description="Não foi possível consultar as mídias. Tente novamente em instantes."
      />
    );
  }

  if (itens.length === 0) {
    return (
      <EmptyState
        title="Nenhuma mídia encontrada"
        description="Ajuste os filtros ou envie uma nova imagem."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {itens.map((media) => (
        <MediaCard key={media.id} media={media} onClick={() => onSelect(media)} />
      ))}
    </div>
  );
}
