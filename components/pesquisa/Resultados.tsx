import ResultadoCard from "./ResultadoCard";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import type { ResultadoPesquisa } from "@/types/homologation";

type Props = {
  resultados: ResultadoPesquisa[];
  buscado: boolean;
  carregando: boolean;
  erro: boolean;
};

export default function Resultados({
  resultados,
  buscado,
  carregando,
  erro,
}: Props) {
  if (carregando) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    );
  }

  if (erro) {
    return (
      <EmptyState
        title="Erro ao buscar homologações"
        description="Não foi possível consultar a base de dados. Tente novamente em instantes."
      />
    );
  }

  if (!buscado) {
    return (
      <EmptyState
        title="Comece sua pesquisa"
        description="Selecione um ou mais filtros acima e clique em Pesquisar para localizar homologações."
      />
    );
  }

  if (resultados.length === 0) {
    return (
      <EmptyState
        title="Nenhum resultado encontrado"
        description="Ajuste os filtros e tente novamente."
      />
    );
  }

  return (
    <div className="space-y-6">
      {resultados.map((resultado) => (
        <ResultadoCard key={resultado.homologacaoId} resultado={resultado} />
      ))}
    </div>
  );
}
