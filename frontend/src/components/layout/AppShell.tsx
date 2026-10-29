import type { ReactNode } from "react";
import { Background } from "./Background";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <Background />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col gap-5 p-3 pl-3 lg:pl-5">
        <TopBar />
        <main className="min-w-0 flex-1 pb-6">{children}</main>
      </div>
    </div>
  );
}
