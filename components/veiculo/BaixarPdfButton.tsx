"use client";

import { Download } from "lucide-react";

/**
 * Gera o PDF da ficha pela impressão do navegador — o globals.css já esconde
 * header/sidebar via @media print, então o resultado é a ficha limpa.
 */
export default function BaixarPdfButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-brand-foreground transition hover:bg-brand-hover"
    >
      <Download size={16} />
      Baixar PDF
    </button>
  );
}
