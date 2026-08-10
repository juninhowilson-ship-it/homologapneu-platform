import { Mail, Phone, MapPin, Code } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#000000] text-[#888888] border-t border-[#333333] mt-16">
      <div className="max-w-full mx-auto px-6 py-12 sm:px-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="font-bold text-white mb-4">🏢 HomologaPneu</h3>
            <p className="text-sm">Plataforma inteligente de homologação de pneus e veículos com dados oficiais.</p>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-semibold text-white mb-4">📦 Produtos</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/dashboard" className="hover:text-[#FFB81C] transition">Dashboard</Link></li>
              <li><Link href="/pesquisa" className="hover:text-[#FFB81C] transition">Busca</Link></li>
              <li><Link href="/marcas" className="hover:text-[#FFB81C] transition">Marcas</Link></li>
              <li><Link href="/relatorios" className="hover:text-[#FFB81C] transition">Relatórios</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-white mb-4">📚 Recursos</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/documentos" className="hover:text-[#FFB81C] transition">Documentos</Link></li>
              <li><Link href="/blog" className="hover:text-[#FFB81C] transition">Blog</Link></li>
              <li><Link href="/suporte" className="hover:text-[#FFB81C] transition">Suporte</Link></li>
              <li><Link href="/termos" className="hover:text-[#FFB81C] transition">Termos</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">📞 Contato</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                contato@homologapneu.com.br
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                (19) 99999-9999
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Limeira - SP, Brasil
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-[#333333] pt-8 flex flex-col md:flex-row items-center justify-between">
          <p className="text-xs text-[#666666]">&copy; 2026 HomologaPneu. Todos os direitos reservados.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="text-[#888888] hover:text-[#FFB81C] transition"><Code className="w-5 h-5" /></a>
            <a href="#" className="text-[#888888] hover:text-[#FFB81C] transition text-sm">Twitter</a>
            <a href="#" className="text-[#888888] hover:text-[#FFB81C] transition text-sm">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
