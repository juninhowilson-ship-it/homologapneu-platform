import FabricanteForm from "@/components/fabricantes/FabricanteForm";
import FabricanteList from "@/components/fabricantes/FabricanteList";

export default function FabricantesPage() {

    return (

        <main className="flex-1 p-10 bg-slate-100 min-h-screen">

            <h1 className="text-4xl font-bold mb-8">

                Fabricantes

            </h1>

            <div className="grid grid-cols-3 gap-8">

                <div>

                    <FabricanteForm />

                </div>

                <div className="col-span-2">

                    <FabricanteList />

                </div>

            </div>

        </main>

    );

}