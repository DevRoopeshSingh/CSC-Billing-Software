// scripts/after-pack.mjs
// electron-builder afterPack hook: rebuild native modules against the packaged
// Electron ABI so better-sqlite3 loads correctly on the target machine.

import { rebuild } from "@electron/rebuild";
import path from "node:path";

export default async function afterPack(context) {
  const { appOutDir, packager, electronPlatformName } = context;
  
  const electronVersion = packager.info.framework.version;
  
  const workDir = path.join(
    appOutDir,
    electronPlatformName === "darwin" 
      ? `${packager.appInfo.productFilename}.app`
      : "",
    "Contents",
    "Resources",
    "app"
  );

  try {
    console.log(`[after-pack] rebuilding native modules in ${workDir}`);
    await rebuild({
      buildPath: workDir,
      electronVersion,
      force: true,
      onlyModules: ["better-sqlite3"],
    });
    console.log("[after-pack] native rebuild complete");
  } catch (err) {
    console.log(`[after-pack] rebuild error (may be expected): ${err.message}`);
  }
}