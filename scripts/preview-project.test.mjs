import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { projectProcess } from "./local-processes.mjs";
import { looksLikePreviewProcess } from "./preview.mjs";

const exec = promisify(execFile);
const source = dirname(fileURLToPath(import.meta.url));

function fixture(t, port) {
  const root = mkdtempSync(join(tmpdir(), "preview ownership "));
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, ".grok"));
  for (const name of ["preview.mjs", "local-processes.mjs", "dev-ports.mjs"]) {
    copyFileSync(join(source, name), join(root, "scripts", name));
  }
  writeFileSync(join(root, "package.json"), '{"type":"module"}');
  const script = join(root, "scripts/preview.mjs");
  writeFileSync(
    script,
    readFileSync(script, "utf8").replace("PREVIEW_PORT = 8081", `PREVIEW_PORT = ${port}`),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, script };
}

test(
  "preview stop spares an unrelated TCP owner and stale PID; restart fails safely",
  { skip: process.platform !== "linux", timeout: 10000 },
  async (t) => {
    const listener = createServer((socket) => socket.destroy());
    await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
    t.after(() => new Promise((resolve) => listener.close(resolve)));
    const { root, script } = fixture(t, listener.address().port);
    // This test process owns the port, but it does not belong to the fixture.
    writeFileSync(join(root, ".grok/preview.pid"), String(process.pid));
    await exec(process.execPath, [script, "stop"], { cwd: tmpdir(), timeout: 5000 });
    assert.equal(listener.listening, true);
    await assert.rejects(
      exec(process.execPath, [script, "restart"], { cwd: tmpdir(), timeout: 5000 }),
      /leaving it untouched/,
    );
    assert.equal(listener.listening, true);
  },
);

test(
  "preview stop still terminates a verified preview from its own repository",
  { skip: process.platform !== "linux", timeout: 10000 },
  async (t) => {
    const { root, script } = fixture(t, 8081);
    const child = spawn(
      process.execPath,
      ["-e", "process.title='npm run preview';setInterval(()=>{},1000)"],
      {
        cwd: root,
        detached: true,
        stdio: "ignore",
      },
    );
    const exit = new Promise((resolve) => child.once("exit", resolve));
    t.after(() => child.kill());
    await new Promise((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    });
    // Wait for the child to set its title, without assuming PID alone is ownership.
    for (let attempt = 0; attempt < 150; attempt++) {
      if (projectProcess(child.pid, root, looksLikePreviewProcess)) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(projectProcess(child.pid, root, looksLikePreviewProcess), true);
    writeFileSync(join(root, ".grok/preview.pid"), String(child.pid));
    const stopped = await exec(process.execPath, [script, "stop"], { timeout: 7000 });
    assert.match(stopped.stdout, /stopped this project/);
    await exit;
    assert.notEqual(child.exitCode === null && child.signalCode === null, true);
  },
);
