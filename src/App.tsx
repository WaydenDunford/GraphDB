import { Toaster } from "sonner";
import { SchemaWorkbench } from "@/components/dashboard/schema-workbench";
import { ThemeProvider } from "@/components/providers/theme-provider";

export function App() {
  return (
    <ThemeProvider>
      <SchemaWorkbench />
      <Toaster richColors theme="dark" position="bottom-right" />
    </ThemeProvider>
  );
}
