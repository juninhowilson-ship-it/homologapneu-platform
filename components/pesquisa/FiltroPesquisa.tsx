export default function FiltroPesquisa() {
  return (

    <div className="flex gap-4 mb-8">

      <button className="bg-yellow-500 px-6 py-3 rounded-lg font-bold">
        Todos
      </button>

      <button className="bg-white px-6 py-3 rounded-lg shadow">
        Veículos
      </button>

      <button className="bg-white px-6 py-3 rounded-lg shadow">
        Pneus
      </button>

      <button className="bg-white px-6 py-3 rounded-lg shadow">
        Fabricantes
      </button>

    </div>

  );
}