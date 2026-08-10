import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Download, Star, AlertCircle } from 'lucide-react';
import Link from 'next/link';

async function getHomologationDetails(id: string) {
  try {
    return await prisma.homologation.findUnique({
      where: { id: parseInt(id) },
      include: {
        vehicleVersion: {
          include: {
            vehicleModel: { include: { manufacturer: true } },
            engine: true,
          },
        },
        tires: { include: { tire: true } },
      },
    });
  } catch {
    return null;
  }
}

export default async function HomologationDetailPage({ params }: { params: { id: string } }) {
  const homog = await getHomologationDetails(params.id);
  if (!homog) notFound();

  const vm = homog.vehicleVersion.vehicleModel;
  const isValidated = homog.validationStatus === 'VALIDADO';
  const originalTires = homog.tires.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Breadcrumb Alert Bar */}
      <div className="bg-[#FFB81C] text-black px-6 py-3 flex items-center gap-3">
        <AlertCircle className="w-5 h-5" />
        <div className="flex items-center gap-2 text-sm">
          <Link href="/" className="font-semibold hover:underline">Home</Link>
          <span>/</span>
          <Link href="#" className="hover:underline">{vm.manufacturer.name}</Link>
          <span>/</span>
          <Link href="#" className="hover:underline">{vm.name}</Link>
          <span>/</span>
          <span>{homog.vehicleVersion.yearStart}</span>
          <span>/</span>
          <span className="font-semibold">Pneus</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-full mx-auto px-6 py-8 sm:px-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Left: Vehicle Card */}
          <div className="lg:col-span-1">
            <div className="bg-[#1a1a1a] rounded-xl border border-[#333333] overflow-hidden">
              <div className="bg-[#2a2a2a] p-6 flex flex-col items-center justify-center min-h-80">
                {vm.photoUrl ? (
                  <img src={vm.photoUrl} alt={vm.name} className="max-h-64 max-w-full object-contain" />
                ) : (
                  <div className="text-[#888888]">Sem foto</div>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-start gap-2 mb-4">
                  <div className="w-8 h-8 rounded bg-[#FFB81C] flex items-center justify-center">
                    {vm.manufacturer.name[0]}
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{vm.name}</h3>
                    <p className="text-sm text-[#888888]">{homog.vehicleVersion.name}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-[#888888]">Código Tipo</p>
                    <p className="text-white font-mono">{homog.code}</p>
                  </div>
                  <div>
                    <p className="text-[#888888]">Segmento</p>
                    <p className="text-white">Sedan Médio</p>
                  </div>
                  <div>
                    <p className="text-[#888888]">Tração</p>
                    <p className="text-white">Dianteira</p>
                  </div>
                  <div>
                    <p className="text-[#888888]">Potência</p>
                    <p className="text-white font-mono">175 cv</p>
                  </div>
                  <div>
                    <p className="text-[#888888]">Peso</p>
                    <p className="text-white font-mono">1.405 kg</p>
                  </div>
                  <div>
                    <p className="text-[#888888]">Lugares</p>
                    <p className="text-white">5</p>
                  </div>
                </div>

                <button className="w-full mt-6 flex items-center justify-center gap-2 bg-[#FFB81C] text-black px-4 py-2 rounded font-semibold hover:bg-[#FFC847] transition">
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>

          {/* Middle: Tires Table */}
          <div className="lg:col-span-2">
            <div className="bg-[#1a1a1a] rounded-xl border border-[#333333] overflow-hidden">
              <div className="bg-[#2a2a2a] px-6 py-4 border-b border-[#333333]">
                <h2 className="text-white font-bold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-[#FFB81C]" />
                  Pneus Originais (Homologados de Fábrica)
                </h2>
                <p className="text-xs text-[#888888] mt-1">Opções Especificamente Aprovadas</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#333333] bg-[#0f0f0f]">
                      <th className="text-left px-6 py-3 text-[#888888] font-semibold text-xs uppercase">Medida</th>
                      <th className="text-left px-6 py-3 text-[#888888] font-semibold text-xs uppercase">Modelo Yokohama</th>
                      <th className="text-left px-6 py-3 text-[#888888] font-semibold text-xs uppercase">Índice</th>
                      <th className="text-left px-6 py-3 text-[#888888] font-semibold text-xs uppercase">Tecnologia</th>
                      <th className="text-left px-6 py-3 text-[#888888] font-semibold text-xs uppercase">OE Code</th>
                      <th className="text-center px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {originalTires.map((ht, i) => (
                      <tr key={ht.id} className={`border-b border-[#333333] ${i === 2 ? 'bg-[#FFB81C]/10 border-[#FFB81C]' : 'hover:bg-[#2a2a2a]'}`}>
                        <td className={`px-6 py-4 font-bold ${i === 2 ? 'text-[#FFB81C]' : 'text-white'}`}>{ht.tire.size}</td>
                        <td className="px-6 py-4 text-[#e5e5e5]">{ht.tire.brand} {ht.tire.model}</td>
                        <td className="px-6 py-4 text-[#e5e5e5]">{ht.tire.size.slice(-3)}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded text-xs bg-[#1a5e3d] text-[#51e0a1]">
                            {ht.role || 'Padrão'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#888888] font-mono">-</td>
                        <td className="px-6 py-4 text-center">
                          <button className="text-[#FFB81C] hover:text-[#FFC847]">
                            <Star className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Compatible Tires Section */}
              <div className="bg-[#2a2a2a] px-6 py-4 border-t border-[#333333] mt-6">
                <h3 className="text-white font-bold text-sm">Aplicações Compatíveis (Outras Opções Aprovadas)</h3>
                <p className="text-xs text-[#888888] mt-1">Medida | Modelo Yokohama | Índice | Categoria | Aplicação</p>
              </div>

              <div className="p-6">
                <div className="text-center">
                  <button className="text-[#FFB81C] hover:text-[#FFC847] text-sm font-semibold">Ver mais 12 opções →</button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Tire Details & Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Selected Tire */}
            <div className="bg-[#1a1a1a] rounded-xl border border-[#333333] overflow-hidden">
              <div className="bg-[#2a2a2a] p-4 border-b border-[#333333]">
                <p className="text-xs text-[#888888] uppercase font-semibold">Detalhes da Medida Selecionada</p>
              </div>
              <div className="p-6">
                <p className="text-2xl font-bold text-white mb-6">225/45R18 95Y XL</p>

                <div className="space-y-4">
                  <div>
                    <p className="text-[#888888] text-xs uppercase font-semibold">Largura (mm)</p>
                    <p className="text-white font-bold text-lg">225</p>
                  </div>
                  <div>
                    <p className="text-[#888888] text-xs uppercase font-semibold">Perfil (%)</p>
                    <p className="text-white font-bold text-lg">45</p>
                  </div>
                  <div>
                    <p className="text-[#888888] text-xs uppercase font-semibold">Aro (Polegadas)</p>
                    <p className="text-white font-bold text-lg">R18</p>
                  </div>
                  <div>
                    <p className="text-[#888888] text-xs uppercase font-semibold">Índice de Carga</p>
                    <p className="text-white font-bold text-lg">95</p>
                  </div>
                  <div>
                    <p className="text-[#888888] text-xs uppercase font-semibold">Índice de Velocidade</p>
                    <p className="text-white font-bold text-lg">Y (300 km/h)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* About Tire */}
            <div className="bg-[#1a1a1a] rounded-xl border border-[#333333] overflow-hidden">
              <div className="bg-[#2a2a2a] p-4 border-b border-[#333333]">
                <p className="text-xs text-[#888888] uppercase font-semibold">Sobre este Pneu</p>
              </div>
              <div className="p-6">
                <h3 className="text-white font-bold mb-2">ADVAN Sport V107</h3>
                <p className="text-[#888888] text-sm mb-4">
                  Desenvolvido para máxima performance em alta velocidade e estabilidade
                </p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-[#2a2a2a] p-3 rounded">
                    <p className="text-[#FFB81C] font-bold">🏁</p>
                    <p className="text-xs text-[#888888] mt-1">Performance</p>
                  </div>
                  <div className="bg-[#2a2a2a] p-3 rounded">
                    <p className="text-[#51e0a1] font-bold">🛡️</p>
                    <p className="text-xs text-[#888888] mt-1">Segurança</p>
                  </div>
                  <div className="bg-[#2a2a2a] p-3 rounded">
                    <p className="text-[#51e0a1] font-bold">✓</p>
                    <p className="text-xs text-[#888888] mt-1">Durabilidade</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Card */}
            {isValidated && (
              <div className="bg-gradient-to-br from-[#1a5e3d] to-[#0f3a26] rounded-xl border border-[#51e0a1] p-4">
                <p className="text-[#51e0a1] text-sm font-bold">✓ Homologação Validada</p>
                <p className="text-xs text-[#a1e0c5] mt-1">Informações verificadas e confiáveis</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  try {
    const homogs = await prisma.homologation.findMany({ select: { id: true }, take: 100 });
    return homogs.map(h => ({ id: h.id.toString() }));
  } catch {
    return [];
  }
}

export const revalidate = 3600;
