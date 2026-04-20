import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  base: "",
  plugins: [
    react(),
    {
      name: "relative-index-asset-paths",
      transformIndexHtml(html) {
        return html.replace(/(src|href)="\.\/assets\//g, '$1="assets/');
      }
    }
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});
