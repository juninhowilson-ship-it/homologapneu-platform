export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100">

      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-8 shadow">

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center text-black font-bold">
            HP
          </div>

          <div>

            <h1 className="text-xl font-bold">
              HomologaPneu
            </h1>

            <p className="text-xs text-gray-400">
              Plataforma Inteligente de Homologação
            </p>

          </div>

        </div>

        <div className="flex items-center gap-6">

          <button>
            🔔
          </button>

          <button>
            ⚙️
          </button>

          <div className="font-semibold">
            Wilson
          </div>

        </div>

      </header>

      <div className="flex">

        <aside className="w-64 bg-slate-800 min-h-[calc(100vh-64px)] text-white p-6">

          <h2 className="text-xs uppercase text-gray-400 mb-6">
            MENU
          </h2>

          <nav className="space-y-3">

            <button className="w-full text-left p-3 rounded-lg bg-yellow-500 text-black font-semibold">
              Dashboard
            </button>

            <button className="w-full text-left p-3 rounded-lg hover:bg-slate-700">
              Pesquisa
            </button>

            <button className="w-full text-left p-3 rounded-lg hover:bg-slate-700">
              Veículos
            </button>

            <button className="w-full text-left p-3 rounded-lg hover:bg-slate-700">
              Pneus
            </button>

            <button className="w-full text-left p-3 rounded-lg hover:bg-slate-700">
              Homologações
            </button>

            <button className="w-full text-left p-3 rounded-lg hover:bg-slate-700">
              Centro Técnico
            </button>

            <button className="w-full text-left p-3 rounded-lg hover:bg-slate-700">
              IA
            </button>

            <button className="w-full text-left p-3 rounded-lg hover:bg-slate-700">
              Analytics
            </button>

            <button className="w-full text-left p-3 rounded-lg hover:bg-slate-700">
              Configurações
            </button>

          </nav>

        </aside>

        <section className="flex-1 p-10">

          <h2 className="text-3xl font-bold mb-8">
            Dashboard
          </h2>

          <div className="grid grid-cols-4 gap-6">

            <div className="bg-white rounded-xl p-6 shadow">
              <h3 className="text-gray-500">
                Veículos
              </h3>

              <p className="text-4xl font-bold mt-3">
                0
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow">
              <h3 className="text-gray-500">
                Pneus
              </h3>

              <p className="text-4xl font-bold mt-3">
                0
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow">
              <h3 className="text-gray-500">
                Homologações
              </h3>

              <p className="text-4xl font-bold mt-3">
                0
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow">
              <h3 className="text-gray-500">
                Fabricantes
              </h3>

              <p className="text-4xl font-bold mt-3">
                0
              </p>
            </div>

          </div>

        </section>

      </div>

    </main>
  );
}