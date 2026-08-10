'use client';

import { FileText, Download } from 'lucide-react';

export default function DocumentosPage() {
  const docs = [
    { title: 'Guia de Homologações', format: 'PDF', size: '2.4 MB', date: '2024-08' },
    { title: 'Especificações Técnicas', format: 'PDF', size: '1.8 MB', date: '2024-08' },
    { title: 'Catálogo Completo', format: 'XLSX', size: '5.2 MB', date: '2024-08' },
    { title: 'Manual de Uso', format: 'PDF', size: '890 KB', date: '2024-08' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#FFB81C] text-black px-6 py-4">
        <div className="max-w-full mx-auto flex items-center gap-3">
          <FileText className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold">Documentos</h1>
            <p className="text-sm text-black/70">Arquivos e recursos da plataforma</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-full mx-auto px-6 py-12 sm:px-12">
        <h2 className="text-2xl font-bold text-white mb-6">📚 Arquivos Disponíveis</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {docs.map((doc, i) => (
            <div key={i} className="rounded-lg border border-[#333333] bg-[#1a1a1a] p-6 hover:border-[#FFB81C] transition-all">
              <div className="flex items-start gap-3 mb-4">
                <FileText className="w-6 h-6 text-[#FFB81C]" />
                <span className="text-xs px-2 py-1 rounded bg-[#FFB81C]/20 text-[#FFB81C] font-bold">
                  {doc.format}
                </span>
              </div>
              <h3 className="font-bold text-white mb-3 text-sm">{doc.title}</h3>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#888888]">{doc.size}</span>
                <button className="p-2 rounded bg-[#FFB81C]/20 text-[#FFB81C] hover:bg-[#FFB81C]/30 transition">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
