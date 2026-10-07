import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { namespaceId, procDirectory, projectProcess } from "./local-processes.mjs";

test("process IDs use the innermost namespace, including process groups", () => {
  assert.equal(namespaceId("NSpid:\t18000\t42\nNSpgid:\t17900\t40\n", "NSpid"), 42);
  assert.equal(namespaceId("NSpid:\t18000\t42\nNSpgid:\t17900\t40\n", "NSpgid"), 40);
  assert.equal(namespaceId("NSpid:\t42\n", "NSpid"), 42);
  assert.equal(namespaceId("Name:\tnode\n", "NSpid"), null);
});

test("ownership requires the current project and command, not just a live PID", () => {
  assert.ok(procDirectory(process.pid));
  assert.equal(
    projectProcess(process.pid, process.cwd(), (cmd) => cmd.includes("node")),
    true,
  );
  assert.equal(
    projectProcess(process.pid, "/another-project", () => true),
    false,
  );
  assert.equal(
    projectProcess(process.pid, process.cwd(), () => false),
    false,
  );
  assert.equal(
    projectProcess(2147483647, process.cwd(), () => true),
    false,
  );
  assert.ok(readFileSync(`${procDirectory(process.pid)}/cmdline`, "utf8").includes("node"));
});
