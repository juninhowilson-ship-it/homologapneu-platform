import { Suspense } from "react";
import RedefinirSenhaForm from "@/components/auth/RedefinirSenhaForm";

export default function RedefinirSenhaPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted p-6">
      <Suspense fallback={null}>
        <RedefinirSenhaForm />
      </Suspense>
    </main>
  );
}
