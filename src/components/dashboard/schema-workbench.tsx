"use client";

import { LeftWorkspacePanel } from "@/components/dashboard/left-workspace-panel";
import { SchemePersistenceController } from "@/components/dashboard/scheme-persistence-controller";
import { TopNav } from "@/components/dashboard/top-nav";
import { SchemaCanvas } from "@/components/schema/schema-canvas";

export function SchemaWorkbench() {
  return (
    <div className="bg-background text-foreground flex h-screen w-screen flex-col overflow-hidden">
      <SchemePersistenceController />
      <TopNav />
      <main className="grid min-h-0 flex-1 grid-rows-[minmax(360px,45vh)_1fr] overflow-hidden lg:grid-cols-[minmax(340px,26vw)_1fr] lg:grid-rows-1">
        <LeftWorkspacePanel />
        <SchemaCanvas />
      </main>
    </div>
  );
}
