import Button from "@/components/ui/Button";

type Props = {
  carregando?: boolean;
};

export default function BotaoPesquisar({ carregando }: Props) {
  return (
    <Button type="submit" className="w-full p-4" disabled={carregando}>
      {carregando ? "Pesquisando..." : "🔎 Pesquisar"}
    </Button>
  );
}
