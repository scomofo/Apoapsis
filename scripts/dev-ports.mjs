import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";

export const DEFAULT_DEV_PORT = 8087;
export const DEV_IDENTITY_ROUTE = "/__dev-server";

export function numericPort(value) {
  if (value === undefined || value === "") return null;
  const text = String(value);
  const port = Number(text);
  if (!/^\d+$/.test(text) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError(`Invalid server port: ${text}. Use digits from 1 to 65535.`);
  }
  return port;
}

// Do not rely on a PID or an HTTP 200 from an unrelated app. The token is local
// runtime state; including the real project path also isolates copied checkouts.
export function projectIdentity(root) {
  const dir = join(root, ".grok");
  const file = join(dir, "dev-token");
  mkdirSync(dir, { recursive: true });
  try {
    writeFileSync(file, randomBytes(32).toString("hex"), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  return createHash("sha256")
    .update(realpathSync(root))
    .update("\0")
    .update(readFileSync(file))
    .digest("hex");
}

export function savedDevPort(root) {
  try {
    return numericPort(readFileSync(join(root, ".grok/dev-port"), "utf8").trim());
  } catch {
    return null;
  }
}

export function recordDevPort(root, port) {
  numericPort(port);
  mkdirSync(join(root, ".grok"), { recursive: true });
  const file = join(root, ".grok/dev-port");
  const staged = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  writeFileSync(staged, `${port}\n`);
  renameSync(staged, file);
}

export async function ownsDevServer(port, identity) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}${DEV_IDENTITY_ROUTE}`, {
      signal: AbortSignal.timeout(800),
      redirect: "error",
    });
    if (!response.ok) return false;
    const body = await response.json();
    return body.identity === identity && body.port === port;
  } catch {
    return false;
  }
}

// Binding a TCP socket also detects non-HTTP listeners and loopback-only owners.
// Vite is started with --strictPort, so a later bind race fails rather than
// silently serving somewhere other than the persisted port.
export function portAvailable(port) {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", (error) => {
      if (["EADDRINUSE", "EACCES"].includes(error.code)) resolve(false);
      else reject(error);
    });
    probe.listen({ port, host: "0.0.0.0", exclusive: true }, () => {
      probe.close(() => resolve(true));
    });
  });
}

export function devRequest(args = [], env = process.env) {
  const rest = [];
  let cliPort = null;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--port") {
      cliPort = numericPort(args[++i]);
      if (cliPort === null) throw new RangeError("--port requires a numeric port.");
    } else if (arg.startsWith("--port=")) {
      cliPort = numericPort(arg.slice(7));
      if (cliPort === null) throw new RangeError("--port requires a numeric port.");
    } else if (arg !== "--strictPort") {
      rest.push(arg);
    }
  }
  // PORT is authoritative on every entry point; CLI and DEV_PORT remain
  // supported overrides when PORT is absent. Explicit ports never scan.
  const port = numericPort(env.PORT) ?? cliPort ?? numericPort(env.DEV_PORT);
  return { port, args: rest };
}

export async function resolveDevPort({ root, args = [], env = process.env }, probes = {}) {
  const request = devRequest(args, env);
  const identity = projectIdentity(root);
  const owns = probes.owns ?? ownsDevServer;
  const available = probes.available ?? portAvailable;
  if (request.port !== null) {
    if (await owns(request.port, identity)) {
      recordDevPort(root, request.port);
      return { ...request, identity, reuse: true };
    }
    if (!(await available(request.port))) {
      throw new Error(
        `Requested dev port ${request.port} is busy; explicit ports never fall back.`,
      );
    }
    return { ...request, identity, reuse: false };
  }
  for (const port of new Set([savedDevPort(root), DEFAULT_DEV_PORT])) {
    if (port !== null && (await owns(port, identity))) {
      recordDevPort(root, port);
      return { ...request, port, identity, reuse: true };
    }
  }
  for (let port = DEFAULT_DEV_PORT; port <= Math.min(65535, DEFAULT_DEV_PORT + 50); port++) {
    if (await available(port)) return { ...request, port, identity, reuse: false };
  }
  throw new Error(`No available dev port from ${DEFAULT_DEV_PORT} to ${DEFAULT_DEV_PORT + 50}.`);
}
