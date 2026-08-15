import { Bot } from "lucide-react";
import AssistenteChat from "@/components/assistente/AssistenteChat";

export default function AssistentePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/15 text-brand">
          <Bot size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">
            IA Assistente
          </h1>
          <p className="text-sm text-muted-foreground">
            Pergunte sobre pneus, medidas e homologações — as respostas usam
            somente os dados verificados da base
          </p>
        </div>
      </div>

      <AssistenteChat alturaClasse="h-[28rem]" />
    </div>
  );
}
