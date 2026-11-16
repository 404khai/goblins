import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const page = (name: string) => resolve(import.meta.dirname, `${name}.html`);

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: { input: { index: page("index"), studio: page("studio"), docs: page("docs"), changelog: page("changelog") } },
    chunkSizeWarningLimit: 900,
  },
});
