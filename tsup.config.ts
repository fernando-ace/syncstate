import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    main: "src/main.ts",
    preload: "src/preload.ts",
    renderer: "src/renderer.ts",
    react: "src/react.ts",
    types: "src/types.ts",
    "demo/main": "demo/main.ts",
    "demo/preload": "demo/preload.ts"
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["electron", "react"],
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".cjs" };
  }
});
