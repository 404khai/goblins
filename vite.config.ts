import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = (name: string) => resolve(import.meta.dirname, `${name}.html`);
const { version } = JSON.parse(readFileSync(resolve(import.meta.dirname, "package.json"), "utf8"));

// The website. The npm package is built separately by scripts/build-lib.ts into dist/.
export default defineConfig({
  base: "./",
  plugins: [react()],
  define: { __GOBLINS_VERSION__: JSON.stringify(version) },
  build: {
    outDir: "dist-site",
    rollupOptions: { input: { index: page("index"), studio: page("studio"), docs: page("docs"), changelog: page("changelog"), zoo: page("zoo") } },
    chunkSizeWarningLimit: 900,
  },
});
