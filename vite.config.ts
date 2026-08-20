import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin";

const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

function workerBundle() {
  return {
    name: "wyiran-worker-bundle",
    apply: "build" as const,
    async closeBundle() {
      const source = await readFile(resolve("worker/index.js"), "utf8");
      await mkdir(resolve("dist/server"), { recursive: true });
      await writeFile(resolve("dist/server/index.js"), source, "utf8");
    },
  };
}

export default defineConfig({
  server: isCodexSeatbeltSandbox
    ? { watch: { useFsEvents: false, usePolling: true } }
    : undefined,
  plugins: [workerBundle(), sites()],
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    sourcemap: false,
    target: "es2022",
    chunkSizeWarningLimit: 750,
  },
  resolve: {
    alias: {
      "@": resolve("src"),
      three: fileURLToPath(new URL("./node_modules/three", import.meta.url)),
    },
  },
});
