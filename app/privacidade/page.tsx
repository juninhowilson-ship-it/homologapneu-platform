import { Shield } from 'lucide-react';

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#003366] to-[#0052CC] px-6 py-16 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FF6B35] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Shield className="w-8 h-8 text-[#FF6B35]" />
            <span className="text-[#FF6B35] font-semibold text-sm uppercase">Legal</span>
          </div>
          <h1 className="text-4xl font-bold text-white">Política de Privacidade</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 sm:px-12 space-y-6">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">1. Coleta de Dados</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Coletamos informações que você nos fornece diretamente, como nome, email e dados de uso da plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">2. Uso de Dados</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Utilizamos seus dados para fornecer, melhorar e personalizar o serviço, e para comunicação com você.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">3. Proteção de Dados</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Implementamos medidas de segurança de padrão industrial para proteger seus dados contra acesso não autorizado.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">4. Direitos do Usuário (GDPR)</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Você tem o direito de acessar, corrigir ou deletar seus dados pessoais. Entre em contato conosco para exercer estes direitos.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">5. Cookies</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Usamos cookies para melhorar sua experiência. Você pode controlar as preferências de cookies nas configurações.
          </p>
        </section>
      </div>
    </div>
  );
}
