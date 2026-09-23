import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "demo/renderer",
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../../dist/demo/renderer",
    emptyOutDir: false
  }
});
