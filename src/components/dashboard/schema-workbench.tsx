import { useState } from "react";
import { LeftWorkspacePanel } from "@/components/dashboard/left-workspace-panel";
import { SchemePersistenceController } from "@/components/dashboard/scheme-persistence-controller";
import { TopNav } from "@/components/dashboard/top-nav";
import { SchemaCanvas } from "@/components/schema/schema-canvas";
import { cn } from "@/lib/utils";

export function SchemaWorkbench() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="bg-background text-foreground flex h-screen w-screen flex-col overflow-hidden">
      <SchemePersistenceController />
      <TopNav />
      <main
        className={cn(
          "grid min-h-0 flex-1 overflow-hidden transition-[grid-template-columns] duration-300",
          isSidebarCollapsed
            ? "grid-cols-1 grid-rows-1"
            : "grid-rows-[minmax(360px,45vh)_1fr] lg:grid-cols-[minmax(340px,26vw)_1fr] lg:grid-rows-1"
        )}
      >
        {isSidebarCollapsed ? null : (
          <LeftWorkspacePanel
            onCollapseSidebar={() => setIsSidebarCollapsed(true)}
          />
        )}
        <SchemaCanvas
          isSidebarCollapsed={isSidebarCollapsed}
          onRestoreSidebar={() => setIsSidebarCollapsed(false)}
        />
      </main>
    </div>
  );
}
