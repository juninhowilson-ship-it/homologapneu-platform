import { Calendar, User, ArrowRight } from 'lucide-react';

export default function BlogPage() {
  const posts = [
    { title: 'Novo padrão ABNT para pneus em 2024', author: 'Admin', date: '15 Set', read: '8 min', category: 'Regulação' },
    { title: 'Inteligência Artificial na validação', author: 'Tech Team', date: '10 Set', read: '12 min', category: 'Tecnologia' },
    { title: 'Guia completo de integração API', author: 'Docs Team', date: '5 Set', read: '15 min', category: 'Tutorial' },
    { title: 'Case study: Continental', author: 'Case Study', date: '1 Set', read: '10 min', category: 'Case Study' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#003366] to-[#0052CC] px-6 py-20 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FF6B35] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto">
          <h1 className="text-5xl font-bold text-white mb-3">Blog</h1>
          <p className="text-lg text-blue-100">Artigos, tutorials e notícias</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 sm:px-12">
        <div className="space-y-6">
          {posts.map((post, i) => (
            <article key={i} className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-800 hover:border-[#FF6B35] transition cursor-pointer group">
              <div className="flex items-start justify-between mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#003366]/10 text-[#003366] dark:bg-[#003366]/20 dark:text-[#0052CC]">
                  {post.category}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{post.read}</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-[#FF6B35] transition">
                {post.title}
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {post.author}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {post.date}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
