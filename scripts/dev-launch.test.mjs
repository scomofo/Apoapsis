import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { ownsDevServer, projectIdentity, savedDevPort } from "./dev-ports.mjs";

const exec = promisify(execFile);
const source = dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function fixture(t, preferred) {
  const root = mkdtempSync(join(tmpdir(), "launcher space "));
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "node_modules/.bin"), { recursive: true });
  for (const name of [
    "with-app-env.mjs",
    "dev-server.mjs",
    "dev-ports.mjs",
    "dev-identity.mjs",
    "app-env-plugin.mjs",
  ]) {
    copyFileSync(join(source, name), join(root, "scripts", name));
  }
  const portFile = join(root, "scripts/dev-ports.mjs");
  writeFileSync(
    portFile,
    readFileSync(portFile, "utf8").replace(
      /DEFAULT_DEV_PORT = \d+/,
      `DEFAULT_DEV_PORT = ${preferred}`,
    ),
  );
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      type: "module",
      scripts: { dev: "node scripts/with-app-env.mjs vite dev --host 0.0.0.0" },
    }),
  );
  writeFileSync(join(root, "startup.sh"), readFileSync(resolve(source, "../startup.sh")));
  writeFileSync(
    join(root, "fake-vite.mjs"),
    `
import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
import { appEnvPlugin } from './scripts/app-env-plugin.mjs';
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]);
if (!args.includes('--strictPort')) throw new Error('dev launch must be strict');
const middleware = [];
const server = createServer((req, res) => {
  if (req.url === '/__stop') {
    res.end('stopping');
    setImmediate(() => { server.close(() => process.exit(0)); server.closeAllConnections(); });
    return;
  }
  let i = 0;
  const next = () => { if (middleware[i]) middleware[i++](req, res, next); else res.end('fixture app'); };
  next();
});
appEnvPlugin().configureServer({ config: { root: process.cwd(), env: { VITE_AUTH_ENABLED: process.env.VITE_AUTH_ENABLED } }, httpServer: server, middlewares: { use: fn => middleware.push(fn) } });
server.listen(port, '0.0.0.0', () => writeFileSync('observed.json', JSON.stringify({ args, auth: process.env.VITE_AUTH_ENABLED })));
`,
  );
  writeFileSync(
    join(root, "node_modules/.bin/vite"),
    "#!/usr/bin/env node\nimport '../../fake-vite.mjs';\n",
  );
  chmodSync(join(root, "node_modules/.bin/vite"), 0o755);
  // Exercise actual cmd.exe shim launching on Windows, with paths containing spaces.
  writeFileSync(
    join(root, "node_modules/.bin/vite.cmd"),
    `@"${process.execPath}" "${join(root, "fake-vite.mjs")}" %*\r\n`,
  );
  const env = { ...process.env, PORT: "", DEV_PORT: "", VITE_AUTH_ENABLED: "false", NO_COLOR: "1" };
  t.after(async () => {
    const port = savedDevPort(root);
    if (port && (await ownsDevServer(port, projectIdentity(root)))) {
      await fetch(`http://127.0.0.1:${port}/__stop`).catch(() => {});
      for (let i = 0; i < 50 && (await ownsDevServer(port, projectIdentity(root))); i++)
        await sleep(20);
    }
    rmSync(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  });
  return { root, env };
}

async function ready(root, port) {
  const identity = projectIdentity(root);
  for (let i = 0; i < 100; i++) {
    if (await ownsDevServer(port, identity)) return;
    await sleep(50);
  }
  throw new Error(
    `Server not ready on ${port}: ${readFileSync(join(root, ".grok/dev.log"), "utf8")}`,
  );
}

async function startup(root, env, args = []) {
  if (process.platform === "win32") {
    return exec(process.execPath, [join(root, "scripts/dev-server.mjs"), ...args], {
      env,
      cwd: tmpdir(),
      timeout: 10000,
    });
  }
  return exec("sh", [join(root, "startup.sh"), ...args], { env, cwd: tmpdir(), timeout: 10000 });
}

test(
  "startup works outside the repo, skips a TCP owner, persists and reuses its own server",
  { timeout: 20000 },
  async (t) => {
    const preferred = await freePort();
    const occupied = createServer((socket) => socket.destroy());
    await new Promise((resolve) => occupied.listen(preferred, "127.0.0.1", resolve));
    t.after(() => new Promise((resolve) => occupied.close(resolve)));
    const { root, env } = fixture(t, preferred);
    const started = await startup(root, env);
    assert.match(started.stdout, /starting/);
    const selected = Number(started.stdout.match(/127\.0\.0\.1:(\d+)/)[1]);
    assert.ok(selected > preferred && selected <= preferred + 50);
    await ready(root, selected);
    assert.equal(savedDevPort(root), selected);
    const pid = readFileSync(join(root, ".grok/dev.pid"), "utf8");
    const again = await startup(root, env);
    assert.match(again.stdout, /reusing/);
    assert.equal(readFileSync(join(root, ".grok/dev.pid"), "utf8"), pid);
    assert.equal(occupied.listening, true);
    const observed = JSON.parse(readFileSync(join(root, "observed.json")));
    assert.equal(observed.auth, "false");
    assert.equal(observed.args[observed.args.indexOf("--port") + 1], String(selected));
  },
);

test(
  "direct npm run dev follows PORT precedence and supports Windows cmd shims",
  { timeout: 20000 },
  async (t) => {
    const port = await freePort();
    const { root, env } = fixture(t, port);
    // Launch npm through the real wrapper; it in turn launches the fixture's
    // bare vite / vite.cmd, exactly as the repository's npm script does.
    const running = exec(
      process.execPath,
      [
        join(root, "scripts/with-app-env.mjs"),
        "npm",
        "run",
        "dev",
        "--",
        "--port",
        String(port + 1),
      ],
      {
        env: { ...env, PORT: String(port), DEV_PORT: String(port + 2) },
        cwd: root,
        timeout: 15000,
      },
    );
    // Attach rejection handling immediately while waiting for readiness.
    const completion = running.then(
      () => null,
      (error) => error,
    );
    await ready(root, port);
    assert.equal(savedDevPort(root), port);
    await fetch(`http://127.0.0.1:${port}/__stop`);
    const error = await completion;
    assert.equal(error, null);
  },
);

test(
  "startup and direct dev reject invalid and busy explicit ports without saving them",
  { timeout: 20000 },
  async (t) => {
    const port = await freePort();
    const occupied = createServer((socket) => socket.destroy());
    await new Promise((resolve) => occupied.listen(port, "127.0.0.1", resolve));
    t.after(() => new Promise((resolve) => occupied.close(resolve)));
    const { root, env } = fixture(t, port);
    for (const value of ["abc", "0", "65536", String(port)]) {
      await assert.rejects(
        startup(root, { ...env, PORT: value }),
        /Invalid server port|explicit ports never fall back/,
      );
      await assert.rejects(
        exec(process.execPath, [join(root, "scripts/with-app-env.mjs"), "vite", "dev"], {
          env: { ...env, PORT: value },
          cwd: root,
          timeout: 10000,
        }),
        /Invalid server port|explicit ports never fall back/,
      );
      assert.equal(savedDevPort(root), null);
    }
    assert.equal(occupied.listening, true);
  },
);
