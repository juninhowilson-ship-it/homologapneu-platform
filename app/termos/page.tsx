import { BookOpen } from 'lucide-react';

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#003366] to-[#0052CC] px-6 py-16 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FF6B35] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <BookOpen className="w-8 h-8 text-[#FF6B35]" />
            <span className="text-[#FF6B35] font-semibold text-sm uppercase">Legal</span>
          </div>
          <h1 className="text-4xl font-bold text-white">Termos de Serviço</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 sm:px-12 prose prose-invert max-w-none">
        <div className="text-gray-900 dark:text-gray-100 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">1. Aceitação dos Termos</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Ao acessar e usar HomologaPneu, você aceita estar vinculado por estes Termos de Serviço. Se não concordar com qualquer parte destes termos, você não pode usar o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">2. Descrição do Serviço</h2>
            <p className="text-gray-600 dark:text-gray-400">
              HomologaPneu fornece uma plataforma inteligente para consulta de homologações de pneus e veículos, com dados oficiais rastreáveis e curadoria inteligente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">3. Licença de Uso</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Concedemos a você uma licença limitada, não-exclusiva e revogável para usar a plataforma de acordo com estes Termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">4. Limitação de Responsabilidade</h2>
            <p className="text-gray-600 dark:text-gray-400">
              HomologaPneu não se responsabiliza por danos indiretos, incidentais ou punitivos resultantes do uso ou incapacidade de usar o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">5. Contato</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Para questões sobre estes Termos, entre em contato com: legal@homologapneu.com.br
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
