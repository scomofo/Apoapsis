import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer as httpServer } from "node:http";
import { createServer as tcpServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  DEFAULT_DEV_PORT,
  DEV_IDENTITY_ROUTE,
  devRequest,
  numericPort,
  ownsDevServer,
  portAvailable,
  projectIdentity,
  recordDevPort,
  resolveDevPort,
  savedDevPort,
} from "./dev-ports.mjs";
import { installDevIdentity } from "./dev-identity.mjs";

function workspace(t) {
  const root = mkdtempSync(join(tmpdir(), "dev ports "));
  t.after(() => rmSync(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }));
  return root;
}

async function listen(t, server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections?.();
      }),
  );
  return server.address().port;
}

test("ports accept only digits in the usable range", () => {
  for (const value of ["0", "65536", "abc", "53xx", "-1", "12.5", " 5300 ", "1e3", "0x10"]) {
    assert.throws(() => numericPort(value), RangeError);
  }
  assert.equal(numericPort(undefined), null);
  assert.equal(numericPort(""), null);
  assert.equal(numericPort("0005300"), 5300);
  assert.equal(numericPort("65535"), 65535);
});

test("PORT wins over CLI and DEV_PORT; CLI and DEV_PORT still work without it", () => {
  assert.deepEqual(
    devRequest(["--port", "5301", "--host", "0.0.0.0"], { PORT: "5300", DEV_PORT: "5302" }),
    {
      port: 5300,
      args: ["--host", "0.0.0.0"],
    },
  );
  assert.equal(devRequest(["--port=5301"], { DEV_PORT: "5302" }).port, 5301);
  assert.equal(devRequest([], { DEV_PORT: "5302" }).port, 5302);
  assert.equal(devRequest([], { PORT: "", DEV_PORT: "5302" }).port, 5302);
  assert.throws(() => devRequest([], { PORT: "oops", DEV_PORT: "5302" }), RangeError);
  for (const args of [["--port"], ["--port="], ["--port", "--host"]]) {
    assert.throws(() => devRequest(args, {}), RangeError);
  }
});

test("identity is stable per real project and isolates a copied token", (t) => {
  const root = workspace(t);
  const other = workspace(t);
  const identity = projectIdentity(root);
  assert.equal(projectIdentity(root), identity);
  projectIdentity(other);
  writeFileSync(join(other, ".grok/dev-token"), readFileSync(join(root, ".grok/dev-token")));
  assert.notEqual(projectIdentity(other), identity);
});

test("an invalid explicit port fails before creating runtime state", async (t) => {
  const root = workspace(t);
  await assert.rejects(resolveDevPort({ root, env: { PORT: "65536" } }), RangeError);
  assert.throws(() => readFileSync(join(root, ".grok/dev-token")), { code: "ENOENT" });
});

test("a healthy saved project server wins over the preferred port", async (t) => {
  const root = workspace(t);
  recordDevPort(root, DEFAULT_DEV_PORT + 7);
  const selected = await resolveDevPort(
    { root, env: {} },
    {
      owns: async (port) => port === DEFAULT_DEV_PORT + 7,
      available: () => assert.fail("reuse must not scan"),
    },
  );
  assert.equal(selected.port, DEFAULT_DEV_PORT + 7);
  assert.equal(selected.reuse, true);
});

test("reusing a healthy preferred project refreshes a stale saved port", async (t) => {
  const root = workspace(t);
  recordDevPort(root, DEFAULT_DEV_PORT + 7);
  const selected = await resolveDevPort(
    { root, env: {} },
    {
      owns: async (port) => port === DEFAULT_DEV_PORT,
      available: () => assert.fail("reuse must not scan"),
    },
  );
  assert.equal(selected.reuse, true);
  assert.equal(savedDevPort(root), DEFAULT_DEV_PORT);
});

test("unrelated saved listeners are ignored; scan starts at preferred and is bounded", async (t) => {
  const root = workspace(t);
  recordDevPort(root, DEFAULT_DEV_PORT + 20);
  const scanned = [];
  const selected = await resolveDevPort(
    { root, env: {} },
    {
      owns: async () => false,
      available: async (port) => {
        scanned.push(port);
        return port === DEFAULT_DEV_PORT + 2;
      },
    },
  );
  assert.deepEqual(scanned, [DEFAULT_DEV_PORT, DEFAULT_DEV_PORT + 1, DEFAULT_DEV_PORT + 2]);
  assert.equal(selected.reuse, false);
  // Selection alone is not proof of a listening server.
  assert.equal(savedDevPort(root), DEFAULT_DEV_PORT + 20);
  scanned.length = 0;
  await assert.rejects(
    resolveDevPort(
      { root, env: {} },
      {
        owns: async () => false,
        available: async (port) => {
          scanned.push(port);
          return false;
        },
      },
    ),
    /No available dev port/,
  );
  assert.equal(scanned.length, 51);
  assert.equal(scanned.at(-1), DEFAULT_DEV_PORT + 50);
});

test("explicit PORT, CLI and DEV_PORT never scan when busy", async (t) => {
  const root = workspace(t);
  for (const request of [
    { env: { PORT: "5300" } },
    { args: ["--port", "5300"], env: {} },
    { env: { DEV_PORT: "5300" } },
  ]) {
    const scanned = [];
    await assert.rejects(
      resolveDevPort(
        { root, ...request },
        {
          owns: async () => false,
          available: async (port) => {
            scanned.push(port);
            return false;
          },
        },
      ),
      /explicit ports never fall back/,
    );
    assert.deepEqual(scanned, [5300]);
  }
  assert.equal(savedDevPort(root), null);
});

test("malformed saved state is ignored", async (t) => {
  const root = workspace(t);
  projectIdentity(root);
  writeFileSync(join(root, ".grok/dev-port"), "not-a-port");
  const selected = await resolveDevPort(
    { root, env: {} },
    {
      owns: async () => false,
      available: async () => true,
    },
  );
  assert.equal(selected.port, DEFAULT_DEV_PORT);
});

test("TCP probe detects non-HTTP and loopback listeners", async (t) => {
  const server = tcpServer((socket) => socket.destroy());
  const port = await listen(t, server);
  assert.equal(await portAvailable(port), false);
  assert.equal(await ownsDevServer(port, "different-project"), false);
});

test("HTTP 200, redirect and mismatched project identity are not reuse", async (t) => {
  let mode = "html";
  const server = httpServer((_req, res) => {
    if (mode === "redirect") {
      res.writeHead(302, { location: DEV_IDENTITY_ROUTE });
      res.end();
    } else if (mode === "html") res.end("<html>another app</html>");
    else res.end(JSON.stringify({ identity: "wrong", port: server.address().port }));
  });
  const port = await listen(t, server);
  for (mode of ["html", "redirect", "json"])
    assert.equal(await ownsDevServer(port, "this-project"), false);
});

test("dev identity endpoint persists the actual bound port and verifies ownership", async (t) => {
  const root = workspace(t);
  const handlers = [];
  const server = httpServer((req, res) => {
    const next = () => {
      const handler = handlers.shift();
      if (handler) {
        handlers.push(handler);
        handler(req, res, () => res.end("app"));
      }
    };
    next();
  });
  installDevIdentity({
    config: { root },
    httpServer: server,
    middlewares: { use: (handler) => handlers.push(handler) },
  });
  assert.equal(savedDevPort(root), null);
  const port = await listen(t, server);
  assert.equal(savedDevPort(root), port);
  assert.equal(await ownsDevServer(port, projectIdentity(root)), true);
  assert.equal(await ownsDevServer(port, projectIdentity(workspace(t))), false);
});
