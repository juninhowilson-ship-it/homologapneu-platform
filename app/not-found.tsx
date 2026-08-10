import { Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-[#FF6B35] mb-4">404</div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">Página não encontrada</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Desculpe, a página que você procura não existe ou foi removida.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#003366] text-white font-semibold hover:bg-[#0052CC] transition">
            <Home className="w-4 h-4" />
            Ir para Home
          </Link>
          <Link href="/pesquisa" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <ArrowLeft className="w-4 h-4" />
            Fazer Busca
          </Link>
        </div>
      </div>
    </div>
  );
}
