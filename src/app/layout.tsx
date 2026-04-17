import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "GraphDB Schema Studio",
  description:
    "Generate, parse, and visualize DBML, SQL, and PostgreSQL schemas."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <Toaster richColors theme="dark" position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
