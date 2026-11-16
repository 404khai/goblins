/**
 * Builds the package into dist/:
 *   dist/lib/*.js          npm entries (three and react stay external peers)
 *   dist/types/**          type declarations
 *   dist/goblins.js        one self-contained ES module, three included, <goblin-avatar> registered
 *   dist/embed.html/.js/.css  the message-driven embed page (classic script, strict CSP)
 *   dist/goblins.schema.json
 */
import { build, type InlineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { goblinSchema } from "../src/goblin/validate";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const base: InlineConfig = {
  configFile: false,
  publicDir: false,
  logLevel: "warn",
  plugins: [react()],
  define: { __GOBLINS_VERSION__: JSON.stringify(pkg.version) },
};

rmSync("dist", { recursive: true, force: true });

await build({
  ...base,
  build: {
    outDir: "dist/lib",
    emptyOutDir: false,
    minify: false,
    sourcemap: true,
    lib: { entry: { index: "src/lib/index.ts", flat: "src/lib/flat.ts", react: "src/lib/react.ts", element: "src/lib/element.ts" }, formats: ["es"] },
    rollupOptions: { external: [/^three($|\/)/, /^react($|\/)/, /^react-dom($|\/)/] },
  },
});

await build({
  ...base,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: { entry: "src/lib/bundle.ts", formats: ["es"], fileName: () => "goblins.js" },
  },
});

await build({
  ...base,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: { entry: "src/embed/main.ts", formats: ["iife"], name: "GoblinsEmbed", fileName: () => "embed.js" },
  },
});
copyFileSync("src/embed/embed.html", "dist/embed.html");
copyFileSync("src/embed/embed.css", "dist/embed.css");

writeFileSync("dist/goblins.schema.json", JSON.stringify(goblinSchema(), null, 2) + "\n");

execSync("bun --bun x tsc -p tsconfig.lib.json", { stdio: "inherit" });
console.log(`built @404khai/goblins ${pkg.version}`);
