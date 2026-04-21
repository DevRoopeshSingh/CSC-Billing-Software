// scripts/build-electron.mjs
// Bundle the Electron main + preload TypeScript into dist-electron/ with esbuild.

import { build } from "esbuild";
import { rm, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist-electron");

const EXTERNAL = [
  "electron",
  "electron-updater",
  "better-sqlite3",
  "node-thermal-printer",
];

async function run() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  await Promise.all([
    build({
      entryPoints: [path.join(root, "src/main/index.ts")],
      outfile: path.join(outDir, "main.js"),
      platform: "node",
      target: "node20",
      format: "cjs",
      bundle: true,
      sourcemap: true,
      external: EXTERNAL,
      logLevel: "info",
    }),
    build({
      entryPoints: [path.join(root, "src/main/preload.ts")],
      outfile: path.join(outDir, "preload.js"),
      platform: "node",
      target: "node20",
      format: "cjs",
      bundle: true,
      sourcemap: true,
      external: ["electron"],
      logLevel: "info",
    }),
  ]);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
