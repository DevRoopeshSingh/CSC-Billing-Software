// scripts/after-pack.mjs
// electron-builder afterPack hook: rebuild native modules against the packaged
// Electron ABI so better-sqlite3 loads correctly on the target machine.

import { rebuild } from "@electron/rebuild";
import path from "node:path";

export default async function afterPack(context) {
  const { appOutDir, packager, electronPlatformName } = context;
  const appDir =
    electronPlatformName === "darwin"
      ? path.join(
          appOutDir,
          `${packager.appInfo.productFilename}.app`,
          "Contents",
          "Resources",
          "app"
        )
      : path.join(appOutDir, "resources", "app");

  const electronVersion = packager.info.framework.version;

  console.log(`[after-pack] rebuilding native modules in ${appDir}`);
  await rebuild({
    buildPath: appDir,
    electronVersion,
    force: true,
    onlyModules: ["better-sqlite3"],
  });
  console.log("[after-pack] native rebuild complete");
}
