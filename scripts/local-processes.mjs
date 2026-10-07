import { readFileSync, readdirSync, readlinkSync } from "node:fs";

// /proc may expose host PIDs while signals use this container's PID namespace.
// Translate only entries in our namespace; never signal a host PID by mistake.
export function namespaceId(status, field) {
  const match = String(status).match(new RegExp(`^${field}:\\s+([\\d\\s]+)$`, "m"));
  const value = Number(match?.[1].trim().split(/\s+/).at(-1));
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function localPid(entry) {
  try {
    if (readlinkSync(`/proc/${entry}/ns/pid`) !== readlinkSync("/proc/self/ns/pid")) return null;
    return namespaceId(readFileSync(`/proc/${entry}/status`, "utf8"), "NSpid");
  } catch {
    return null;
  }
}

export function procDirectory(pid) {
  if (localPid(pid) === pid) return `/proc/${pid}`;
  for (const entry of readdirSync("/proc")) {
    if (/^\d+$/.test(entry) && localPid(entry) === pid) return `/proc/${entry}`;
  }
  return null;
}

export function projectProcess(pid, root, command) {
  const dir = procDirectory(pid);
  if (!dir) return false;
  try {
    if (readlinkSync(`${dir}/cwd`) !== root) return false;
    const status = readFileSync(`${dir}/status`, "utf8");
    if (/^State:\s+Z/m.test(status)) return false;
    return command(readFileSync(`${dir}/cmdline`, "utf8"));
  } catch {
    return false;
  }
}
