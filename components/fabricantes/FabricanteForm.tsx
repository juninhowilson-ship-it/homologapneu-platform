import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function FabricanteForm(){

    return(

        <Card>

            <h2 className="text-xl font-bold mb-5">

                Novo Fabricante

            </h2>

            <div className="space-y-4 mb-4">

                <Input placeholder="Nome" aria-label="Nome" />

                <Input placeholder="País" aria-label="País" />

            </div>

            <Button type="submit">

                Salvar

            </Button>

        </Card>

    )

}