#!/usr/bin/env node
/**
 * Restarts only this project's built-output QA preview on port 8081.
 * Ownership is corroborated before any signal; other apps are never stopped.
 * This helper remains Linux-only. Development startup is cross-platform.
 */
import { localPid, namespaceId, procDirectory, projectProcess } from "./local-processes.mjs";
import { portAvailable } from "./dev-ports.mjs";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PREVIEW_PORT = 8081;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}/`;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PID_FILE = join(ROOT, ".grok/preview.pid");
const LOG_FILE = join(ROOT, ".grok/preview.log");
const READY_TIMEOUT_MS = Number(process.env.PREVIEW_READY_TIMEOUT_MS || 60000);
const GRACE_MS = 3000;
const POLL_MS = 100;

export function parsePreviewArgs(argv) {
  const [action, ...rest] = argv;
  if (!action) return { error: "usage: node scripts/preview.mjs stop|restart" };
  if (rest.length > 0) return { error: `unexpected argument: ${rest[0]}` };
  if (!["stop", "restart"].includes(action)) {
    return { error: `unknown action: ${action} (expected stop or restart)` };
  }
  return { action };
}

export function parsePid(text) {
  const pid = Number.parseInt(String(text ?? "").trim(), 10);
  // pid 1 is the sandbox init — never the preview, and dangerous to signal.
  return Number.isInteger(pid) && pid > 1 ? pid : null;
}

/** pgid of a process from its /proc/<pid>/stat line. */
export function parsePgid(stat) {
  const line = String(stat ?? "");
  // The comm field is parenthesised and may itself contain spaces; state, ppid
  // and pgrp are the three fields after it.
  const end = line.lastIndexOf(") ");
  if (end === -1) return null;
  const pgid = Number.parseInt(line.slice(end + 2).split(/\s+/)[2], 10);
  return Number.isInteger(pgid) && pgid > 0 ? pgid : null;
}

const TCP_LISTEN = "0A";

/** Socket inodes of the LISTEN sockets on `port` in a /proc/net/tcp{,6} dump. */
export function parseListenerInodes(procNetTcp, port) {
  const wanted = `:${port.toString(16).toUpperCase().padStart(4, "0")}`;
  const inodes = [];
  for (const line of String(procNetTcp ?? "").split("\n")) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 10 || cols[3] !== TCP_LISTEN || !cols[1].endsWith(wanted)) continue;
    if (/^\d+$/.test(cols[9])) inodes.push(cols[9]);
  }
  return inodes;
}

export function looksLikePreviewProcess(cmdline) {
  // /proc/<pid>/cmdline is NUL-separated.
  const argv = String(cmdline ?? "")
    .split("\0")
    .filter(Boolean)
    .join(" ");
  // The sandbox service runs scripts/preview-thumbnail.mjs in this box, and
  // this script can be running concurrently: neither is ever a target.
  if (/\bpreview[\w-]*\.mjs\b/.test(argv)) return false;
  // The `npm run preview` wrapper (`npm-cli.js run preview`) and its vite child.
  // `preview` must be the whole script name: `run preview:stop`/`preview:restart`
  // are this tooling's own wrappers, and `vite build --outDir preview-dist` is
  // not a server.
  return /\brun\s+preview(?:\s|$)/.test(argv) || /\bvite\b\s+preview\b/.test(argv);
}

/** Corroborate both project directory and command before signalling. */
export function previewOwners({ portPids, pidFilePid, cmdlineOf, belongsToProject }) {
  const candidates = new Set([...portPids, ...(pidFilePid === null ? [] : [pidFilePid])]);
  return [...candidates].filter(
    (pid) => belongsToProject(pid) && looksLikePreviewProcess(cmdlineOf(pid)),
  );
}

async function waitForExit(pids, { isAlive, sleep, timeoutMs, pollMs }) {
  let remaining = pids.filter((pid) => isAlive(pid));
  for (let waited = 0; remaining.length > 0 && waited < timeoutMs; waited += pollMs) {
    await sleep(pollMs);
    remaining = remaining.filter((pid) => isAlive(pid));
  }
  return remaining;
}

/**
 * SIGTERM every live pid, then SIGKILL whatever outlives the grace period.
 * Returns `{ signalled, killed, stubborn }` — `stubborn` is still alive after
 * the SIGKILL wait, which means the port is not reliably free.
 */
export async function terminatePids(
  pids,
  { kill, isAlive, sleep, graceMs = GRACE_MS, pollMs = POLL_MS },
) {
  const signalled = pids.filter((pid) => isAlive(pid));
  for (const pid of signalled) kill(pid, "SIGTERM");
  const killed = await waitForExit(signalled, { isAlive, sleep, timeoutMs: graceMs, pollMs });
  for (const pid of killed) kill(pid, "SIGKILL");
  const stubborn = await waitForExit(killed, { isAlive, sleep, timeoutMs: graceMs, pollMs });
  return { signalled, killed, stubborn };
}

/**
 * What `stop` reports. `after` is the post-kill port check: `unattributed: true`
 * means a listener exists whose pid could not be resolved, so it may not claim
 * the port is free.
 */
export function stopOutcome({ signalled, stubborn, after }) {
  const held = [...new Set([...stubborn, ...after.pids])];
  if (held.length > 0) {
    return { ok: false, error: `preview is still held by pid(s) ${held.join(", ")}` };
  }
  const message =
    signalled.length > 0
      ? `stopped this project's preview pid(s) ${signalled.join(", ")}`
      : "no preview owned by this project was running";
  return { ok: true, message };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isAlive(pid) {
  try {
    const dir = procDirectory(pid);
    if (dir && /^State:\s+Z/m.test(readFileSync(`${dir}/status`, "utf8"))) return false;
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err?.code === "EPERM";
  }
}

function pgidOf(pid) {
  try {
    const dir = procDirectory(pid);
    return dir ? namespaceId(readFileSync(`${dir}/status`, "utf8"), "NSpgid") : null;
  } catch {
    return null;
  }
}

function killPid(pid, signal) {
  // restart() detaches the server into its own process group, so signal the
  // group to reach `vite` under the `npm` wrapper. Only for a leader: `-pid` on
  // a pid that leads no group still reaches any unrelated group numbered pid.
  if (pgidOf(pid) === pid) {
    try {
      process.kill(-pid, signal);
      return;
    } catch {
      // The group exited between the pgid read and the signal.
    }
  }
  try {
    process.kill(pid, signal);
  } catch {
    // Exited between the liveness check and the signal.
  }
}

function cmdlineOf(pid) {
  try {
    const dir = procDirectory(pid);
    return dir ? readFileSync(`${dir}/cmdline`, "utf8") : "";
  } catch {
    // Usually a dead pid — the stale pidfile this corroboration exists for.
    return "";
  }
}

function readPidFile() {
  try {
    return parsePid(readFileSync(PID_FILE, "utf8"));
  } catch {
    return null;
  }
}

function pidsForSocketInodes(inodes) {
  const targets = new Set([...inodes].map((inode) => `socket:[${inode}]`));
  const pids = [];
  for (const entry of readdirSync("/proc")) {
    const pid = localPid(entry);
    if (pid === null || pid <= 1 || pid === process.pid) continue;
    let fds;
    try {
      fds = readdirSync(`/proc/${entry}/fd`);
    } catch {
      // Exited mid-scan, or owned by another user.
      continue;
    }
    for (const fd of fds) {
      try {
        if (targets.has(readlinkSync(`/proc/${entry}/fd/${fd}`))) {
          pids.push(pid);
          break;
        }
      } catch {
        // fd closed mid-scan.
      }
    }
  }
  return pids;
}

/**
 * `{ pids, unattributed }` — `unattributed: true` when the port has a listener
 * whose owning pid could not be resolved (an fd dir we may not read).
 */
function portOwners() {
  const inodes = new Set();
  for (const file of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    let dump;
    try {
      dump = readFileSync(file, "utf8");
    } catch {
      // tcp6 is absent when the box has no IPv6.
      continue;
    }
    for (const inode of parseListenerInodes(dump, PREVIEW_PORT)) inodes.add(inode);
  }
  const pids = inodes.size > 0 ? pidsForSocketInodes(inodes) : [];
  return { pids, unattributed: inodes.size > 0 && pids.length === 0 };
}

async function stop(announce = true) {
  const owners = previewOwners({
    portPids: portOwners().pids,
    pidFilePid: readPidFile(),
    cmdlineOf,
    belongsToProject: (pid) => projectProcess(pid, ROOT, () => true),
  });
  const { signalled, stubborn } = await terminatePids(owners, { kill: killPid, isAlive, sleep });

  const remaining = previewOwners({
    portPids: portOwners().pids,
    pidFilePid: readPidFile(),
    cmdlineOf,
    belongsToProject: (pid) => projectProcess(pid, ROOT, () => true),
  });
  const outcome = stopOutcome({ signalled, stubborn, after: { pids: remaining } });
  if (!outcome.ok) {
    // Keep the pidfile: a survivor the port scan cannot attribute leaves it as
    // the only record a retry could use.
    console.error(`[preview] ${outcome.error}`);
    return false;
  }
  rmSync(PID_FILE, { force: true });
  if (announce) console.log(`[preview] ${outcome.message}`);
  return true;
}

async function waitForReady(failure) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline && failure() === null) {
    try {
      // Any HTTP response means the server is bound; a 404 is still ready.
      await fetch(PREVIEW_URL, { signal: AbortSignal.timeout(2000) });
      return true;
    } catch {
      await sleep(250);
    }
  }
  return false;
}

async function restart() {
  if (!(await stop())) return 1;
  if (!(await portAvailable(PREVIEW_PORT))) {
    console.error(
      `[preview] port ${PREVIEW_PORT} is held by another process; leaving it untouched`,
    );
    return 1;
  }

  mkdirSync(dirname(LOG_FILE), { recursive: true });
  const log = openSync(LOG_FILE, "a");
  const child = spawn("npm", ["run", "preview"], {
    cwd: ROOT,
    detached: true,
    stdio: ["ignore", log, log],
    // Bare `npm` is a `.cmd` shim on Windows: spawn it through a shell there
    // so the restart path works on win32. False everywhere else.
    shell: process.platform === "win32",
  });
  child.unref();
  writeFileSync(PID_FILE, `${child.pid}\n`);

  let failure = null;
  child.on("error", (err) => {
    failure = `npm run preview could not be spawned: ${err.message}`;
  });
  child.on("exit", (code, signal) => {
    failure = `npm run preview exited early (${signal ?? `code ${code}`})`;
  });

  if (!(await waitForReady(() => failure))) {
    const secs = Math.round(READY_TIMEOUT_MS / 1000);
    const why =
      failure ??
      `nothing answered on ${PREVIEW_URL} within ${secs}s — check that vite.config.ts ` +
        `still sets preview.port ${PREVIEW_PORT}`;
    console.error(`[preview] ${why} — see ${LOG_FILE}`);
    // A server that binds a few seconds later would serve a build the agent has
    // already been told to distrust.
    await stop(false);
    return 1;
  }
  console.log(`[preview] serving ${PREVIEW_URL} (pid ${child.pid}, log ${LOG_FILE})`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parsePreviewArgs(process.argv.slice(2));
  if (args.error) {
    console.error(`[preview] ${args.error}`);
    process.exit(1);
  }
  if (!existsSync("/proc/self")) {
    console.error("[preview] no /proc — this script only runs inside the sandbox");
    process.exit(1);
  }
  process.exitCode = args.action === "stop" ? ((await stop()) ? 0 : 1) : await restart();
}
