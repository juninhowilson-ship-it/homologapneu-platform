import { type ReactNode } from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

type Props = {
  children: ReactNode;
};

export default function AppShell({ children }: Props) {
  return (
    <div className="min-h-screen bg-surface-muted">
      <Header />

      <div className="flex">
        <Sidebar />

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
