'use client';

import { AlertTriangle, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <AlertTriangle className="w-20 h-20 text-[#FF6B35]" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">Erro 500</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">Oops! Algo deu errado</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
          Desculpe, ocorreu um erro inesperado no servidor. Tente novamente em alguns momentos.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#FF6B35] text-white font-semibold hover:bg-[#E55A25] transition"
          >
            Tentar Novamente
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <Home className="w-4 h-4" />
            Ir para Home
          </Link>
        </div>
      </div>
    </div>
  );
}
