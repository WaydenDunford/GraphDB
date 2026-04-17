import { useState } from "react";
import { ApiExplorer } from "@/components/dashboard/api-explorer";
import { LeftWorkspacePanel } from "@/components/dashboard/left-workspace-panel";
import { SchemePersistenceController } from "@/components/dashboard/scheme-persistence-controller";
import { TopNav, type WorkbenchView } from "@/components/dashboard/top-nav";
import { SchemaCanvas } from "@/components/schema/schema-canvas";
import { cn } from "@/lib/utils";

export function SchemaWorkbench() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<WorkbenchView>("playground");

  const handleViewChange = (view: WorkbenchView) => {
    setActiveView(view);
    if (view === "api") {
      setIsSidebarCollapsed(false);
    }
  };

  return (
    <div className="bg-background text-foreground flex h-screen w-screen flex-col overflow-hidden">
      <SchemePersistenceController />
      <TopNav activeView={activeView} onViewChange={handleViewChange} />
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
            onCollapseSidebar={
              activeView === "playground"
                ? () => setIsSidebarCollapsed(true)
                : undefined
            }
          />
        )}
        {activeView === "api" ? (
          <ApiExplorer />
        ) : (
          <SchemaCanvas
            isSidebarCollapsed={isSidebarCollapsed}
            onRestoreSidebar={() => setIsSidebarCollapsed(false)}
          />
        )}
      </main>
    </div>
  );
}
