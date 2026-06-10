import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  PROJECT_END,
  PROJECT_START,
  runContextDoctor,
  runIndex,
  runProjectUpgrade,
  runSync
} from "../src/core.js";

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cci-test-"));
}

test("sync does not overwrite files", () => {
  const root = tempRoot();
  const file = path.join(root, "task.md");
  fs.writeFileSync(file, "custom task", "utf8");
  runSync(root);
  assert.equal(fs.readFileSync(file, "utf8"), "custom task");
});

test("upgrade preserves content outside markers", () => {
  const root = tempRoot();
  const file = path.join(root, ".codex", "AGENTS.md");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `before\n${PROJECT_START}\nold\n${PROJECT_END}\nafter\n`, "utf8");
  runProjectUpgrade(root);
  const content = fs.readFileSync(file, "utf8");
  assert.match(content, /^before/);
  assert.match(content, /after\n$/);
  assert.match(content, /Precomputed Context Engine/);
});

test("index skips .env files", () => {
  const root = tempRoot();
  fs.writeFileSync(path.join(root, ".env"), "TOKEN=secret", "utf8");
  fs.writeFileSync(path.join(root, "app.js"), "export function app() {}\n", "utf8");
  runIndex(root);
  const index = JSON.parse(fs.readFileSync(path.join(root, ".codex", "context", "index.json"), "utf8"));
  assert.equal(index.files.some((file) => file.path === ".env"), false);
});

test("index skips node_modules", () => {
  const root = tempRoot();
  fs.mkdirSync(path.join(root, "node_modules"), { recursive: true });
  fs.writeFileSync(path.join(root, "node_modules", "pkg.js"), "export const pkg = 1;\n", "utf8");
  fs.writeFileSync(path.join(root, "app.js"), "export const app = 1;\n", "utf8");
  runIndex(root);
  const index = JSON.parse(fs.readFileSync(path.join(root, ".codex", "context", "index.json"), "utf8"));
  assert.equal(index.files.some((file) => file.path.includes("node_modules")), false);
});

test("doctor fails when context artifacts are missing", () => {
  const root = tempRoot();
  const result = runContextDoctor(root);
  assert.equal(result.ok, false);
});
