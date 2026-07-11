export default function FabricanteForm(){

    return(

        <div className="bg-white rounded-xl shadow p-6">

            <h2 className="text-xl font-bold mb-5">

                Novo Fabricante

            </h2>

            <input

                placeholder="Nome"

                className="w-full border rounded-lg p-3 mb-4"

            />

            <input

                placeholder="País"

                className="w-full border rounded-lg p-3 mb-4"

            />

            <button

                className="bg-yellow-500 hover:bg-yellow-600 px-6 py-3 rounded-lg font-bold"

            >

                Salvar

            </button>

        </div>

    )

}