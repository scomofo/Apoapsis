import { spawn } from "node:child_process";
import { closeSync, openSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDevPort } from "./dev-ports.mjs";
import { isMainModule } from "./with-app-env.mjs";

export async function launchDev(root, args = [], env = process.env) {
  const selected = await resolveDevPort({ root, args, env });
  if (selected.reuse) return selected;
  const log = openSync(join(root, ".grok/dev.log"), "a");
  try {
    // The existing environment wrapper handles npm.cmd on Windows as well as
    // vite.cmd inside npm run dev. No /proc inspection is needed for reuse.
    const child = spawn(
      process.execPath,
      [join(root, "scripts/with-app-env.mjs"), "npm", "run", "dev", "--", ...selected.args],
      {
        cwd: root,
        env: { ...env, PORT: String(selected.port) },
        detached: true,
        stdio: ["ignore", log, log],
      },
    );
    await new Promise((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    });
    writeFileSync(join(root, ".grok/dev.pid"), `${child.pid}\n`);
    child.unref();
    return selected;
  } finally {
    closeSync(log);
  }
}

if (isMainModule(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  try {
    const selected = await launchDev(root, process.argv.slice(2));
    console.log(
      `[dev] ${selected.reuse ? "reusing" : "starting"} http://127.0.0.1:${selected.port}/`,
    );
  } catch (error) {
    console.error(`[dev] ${error.message}`);
    process.exitCode = 1;
  }
}
