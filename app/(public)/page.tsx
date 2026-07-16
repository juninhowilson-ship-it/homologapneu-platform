import Hero from "@/components/home/Hero";
import StatsSection from "@/components/home/StatsSection";
import HowItWorks from "@/components/home/HowItWorks";
import OfficialSources from "@/components/home/OfficialSources";
import LatestHomologations from "@/components/home/LatestHomologations";
import {
  obterEstatisticasPublicas,
  listarMontadorasOficiais,
  listarUltimasHomologacoes,
} from "@/services/publico";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [stats, montadoras, ultimasHomologacoes] = await Promise.all([
    obterEstatisticasPublicas(),
    listarMontadorasOficiais(),
    listarUltimasHomologacoes(6),
  ]);

  return (
    <>
      <Hero />
      <StatsSection stats={stats} />
      <HowItWorks />
      <OfficialSources montadoras={montadoras} />
      <LatestHomologations homologacoes={ultimasHomologacoes} />
    </>
  );
}
