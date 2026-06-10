import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

export const OLD_START = "<!-- CODEX-CONTEXT-INIT:START -->";
export const OLD_END = "<!-- CODEX-CONTEXT-INIT:END -->";
export const PROJECT_START = "<!-- CODEX-CONTEXT-INIT:PROJECT:START -->";
export const PROJECT_END = "<!-- CODEX-CONTEXT-INIT:PROJECT:END -->";
export const GLOBAL_START = "<!-- CODEX-CONTEXT-INIT:GLOBAL:START -->";
export const GLOBAL_END = "<!-- CODEX-CONTEXT-INIT:GLOBAL:END -->";

const DEFAULT_MAX_FILE_SIZE_KB = 300;
const HEAVY_DIRS = new Set(["node_modules", ".git", "dist", "build", "out", "coverage", ".next", ".nuxt", "target", "vendor", ".venv", "__pycache__"]);
const CONTEXT_FILES = ["index.json", "summary.md", "symbols.md", "files.md", "routes.md", "dependencies.md", "recent_changes.md"];

export const globalManagedBlock = `${GLOBAL_START}
# Global Codex Token Optimization Rules

You are operating in AGGRESSIVE TOKEN OPTIMIZATION MODE.

## Global Behavior

- Complete coding tasks with the fewest tokens, fewest file reads, smallest diff, and shortest useful response.
- Do not explain unless explicitly asked.
- Do not teach.
- Do not summarize the repository.
- Do not restate the user request.
- Do not provide alternatives unless blocked.
- Do not create long plans.
- Ask clarifying questions only when the task is impossible or unsafe without one.

## Context Usage

- Read the minimum files required.
- Prefer targeted search over broad exploration.
- Never scan the whole repository unless explicitly requested.
- Stop reading once enough context is found.
- Use open files, visible errors, and user-provided context first.

## Editing

- Make the smallest correct change.
- Prefer local fixes over refactors.
- Reuse existing patterns.
- Do not rename, reformat, or reorganize unrelated code.
- Avoid dependency changes unless essential.

## Validation

- Run only the narrowest relevant check.
- Prefer targeted tests over full test suites.
- If validation is skipped, say why in one short sentence.

## Response Format

Return only:

CHANGED
- path/to/file

VALIDATION
- command or "not run"

DONE
${GLOBAL_END}`;

export const projectManagedBlock = `${PROJECT_START}
# Project Codex Context Rules

## Precomputed Context Engine

Before broad repository search, read these generated context files if present:

1. .codex/context/summary.md
2. .codex/context/dependencies.md
3. .codex/context/files.md
4. .codex/context/symbols.md
5. .codex/context/routes.md
6. .codex/context/recent_changes.md

Use these as pre-indexed repository context.

Rules:
- Prefer these files before scanning directories.
- Use them to identify the smallest relevant file set.
- Do not treat them as always complete.
- If generated context conflicts with source code, source code wins.
- After meaningful code changes, update the context index by running:
  \`codex-context-init index\`

## Context Source Priority

Then read these project-maintained files when present:

1. task.md
2. architecture.md
3. decision_log.md
4. project_context.md

Do not scan the repository until these context files have been checked.

## Project Documentation Rules

- Update task.md after meaningful progress.
- Update decision_log.md only when a technical decision is made.
- Update architecture.md only when structure, dependencies, boundaries, or data flow change.
- Update project_context.md only when product goals, constraints, or scope change.
- Do not generate extra documentation unless requested.

## Project Search Rules

- Prefer context files before broad repository search.
- Search only files directly related to the current task.
- Stop searching once sufficient context is found.
${PROJECT_END}`;

const templates = {
  "project_context.md": `# Project Context

## Product / Project Name

TODO

## Goal

TODO

## Users

TODO

## Core Features

TODO

## Non-Goals

TODO

## Constraints

- Prefer small, maintainable changes.
- Prefer existing patterns.
- Avoid unnecessary dependencies.
- Optimize Codex token usage.

## Current Scope

TODO
`,
  "architecture.md": `# Architecture

## Overview

TODO

## Tech Stack

TODO

## Main Components

TODO

## Data Flow

TODO

## Important Directories

TODO

## Integration Points

TODO

## Constraints

- Keep architecture simple.
- Avoid premature abstractions.
- Prefer modular boundaries.
`,
  "task.md": `# Task

## Current Task

TODO

## Status

Not started.

## Relevant Files

TODO

## Acceptance Criteria

TODO

## Notes for Codex

- Read this file first.
- Only inspect files directly related to the current task.
- Keep changes minimal.
`,
  "decision_log.md": `# Decision Log

Record only meaningful technical decisions.

## Format

### YYYY-MM-DD - Decision Title

Decision:
TODO

Reason:
TODO

Impact:
TODO
`
};

export const requiredFiles = [
  path.join(".codex", "AGENTS.md"),
  path.join(".codex", "templates", "project_context.template.md"),
  path.join(".codex", "templates", "architecture.template.md"),
  path.join(".codex", "templates", "task.template.md"),
  path.join(".codex", "templates", "decision_log.template.md"),
  "project_context.md",
  "architecture.md",
  "task.md",
  "decision_log.md"
];

export const contextFiles = CONTEXT_FILES.map((file) => path.join(".codex", "context", file));

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function fileExists(file) {
  return fs.existsSync(file);
}

export function writeFileIfMissing(file, content) {
  if (fileExists(file)) return false;
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
  return true;
}

export function writeFileForce(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
}

export function getGlobalAgentsPath() {
  return path.join(os.homedir(), ".codex", "AGENTS.md");
}

function newlineOf(content) {
  return content.includes("\r\n") ? "\r\n" : "\n";
}

function finish(content, newline) {
  return content.replace(/[\r\n]*$/, "") + newline;
}

export function upsertManagedBlock(existingContent, startMarker, endMarker, newBlock) {
  const hasStart = existingContent.includes(startMarker);
  const hasEnd = existingContent.includes(endMarker);
  const newline = newlineOf(existingContent || newBlock);
  const block = newBlock.replace(/\n/g, newline);

  if (hasStart !== hasEnd) return { ok: false, error: "Managed block has only one marker." };

  if (hasStart) {
    const start = existingContent.indexOf(startMarker);
    const end = existingContent.indexOf(endMarker);
    if (end < start) return { ok: false, error: "Managed block markers are out of order." };
    const next = existingContent.slice(0, start) + block + existingContent.slice(end + endMarker.length);
    return { ok: true, content: finish(next, newline), action: "updated" };
  }

  const base = existingContent.trimEnd();
  const next = base ? `${base}${newline}${newline}${block}` : block;
  return { ok: true, content: finish(next, newline), action: existingContent ? "appended" : "created" };
}

function migrateOldProjectMarkers(content) {
  return content.replace(OLD_START, PROJECT_START).replace(OLD_END, PROJECT_END);
}

function filesFor(root) {
  return {
    [path.join(root, ".codex", "AGENTS.md")]: projectManagedBlock,
    [path.join(root, ".codex", "templates", "project_context.template.md")]: templates["project_context.md"],
    [path.join(root, ".codex", "templates", "architecture.template.md")]: templates["architecture.md"],
    [path.join(root, ".codex", "templates", "task.template.md")]: templates["task.md"],
    [path.join(root, ".codex", "templates", "decision_log.template.md")]: templates["decision_log.md"],
    [path.join(root, "project_context.md")]: templates["project_context.md"],
    [path.join(root, "architecture.md")]: templates["architecture.md"],
    [path.join(root, "task.md")]: templates["task.md"],
    [path.join(root, "decision_log.md")]: templates["decision_log.md"]
  };
}

export function runNew(projectName, options = {}) {
  if (!projectName) throw new Error("Project name is required");
  const root = path.resolve(projectName);
  ensureDir(root);
  let created = 0;
  let updated = 0;
  for (const [file, content] of Object.entries(filesFor(root))) {
    if (options.force) {
      writeFileForce(file, content);
      updated += 1;
    } else if (writeFileIfMissing(file, content)) {
      created += 1;
    }
  }
  return { root, created, updated };
}

export function runSync(root = process.cwd()) {
  let created = 0;
  for (const [file, content] of Object.entries(filesFor(root))) {
    if (writeFileIfMissing(file, content)) created += 1;
  }
  return { root, created };
}

export function runProjectDoctor(root = process.cwd()) {
  const results = requiredFiles.map((file) => {
    const found = fileExists(path.join(root, file));
    return { file, found, line: `${found ? "OK" : "MISSING"} ${file} ${found ? "found" : "missing"}` };
  });
  return { ok: results.every((result) => result.found), results };
}

export function runDoctor(root = process.cwd()) {
  return runProjectDoctor(root);
}

export function runProjectUpgrade(root = process.cwd()) {
  const file = path.join(root, ".codex", "AGENTS.md");
  const existing = fileExists(file) ? migrateOldProjectMarkers(fs.readFileSync(file, "utf8")) : "";
  const result = upsertManagedBlock(existing, PROJECT_START, PROJECT_END, projectManagedBlock);
  if (!result.ok) throw new Error(result.error);
  writeFileForce(file, result.content);
  return { file, action: result.action };
}

export function runUpgrade(root = process.cwd()) {
  return runProjectUpgrade(root);
}

export function runGlobalSetup() {
  const file = getGlobalAgentsPath();
  const existing = fileExists(file) ? fs.readFileSync(file, "utf8") : "";
  const result = upsertManagedBlock(existing, GLOBAL_START, GLOBAL_END, globalManagedBlock);
  if (!result.ok) throw new Error(result.error);
  writeFileForce(file, result.content);
  return { file, action: result.action };
}

export function runGlobalDoctor() {
  const file = getGlobalAgentsPath();
  const exists = fileExists(file);
  const content = exists ? fs.readFileSync(file, "utf8") : "";
  const hasBlock = content.includes(GLOBAL_START) && content.includes(GLOBAL_END);
  const results = [
    { found: exists, line: `${exists ? "OK" : "MISSING"} ~/.codex/AGENTS.md ${exists ? "found" : "missing"}` },
    { found: hasBlock, line: `${hasBlock ? "OK" : "MISSING"} global managed block ${hasBlock ? "found" : "missing"}` }
  ];
  return { ok: results.every((result) => result.found), results };
}

function isSecretFile(name) {
  return name === ".env"
    || name.startsWith(".env.")
    || name.endsWith(".pem")
    || name.endsWith(".key")
    || name === "id_rsa"
    || name === "id_ed25519"
    || name.startsWith("secrets.")
    || name.startsWith("credentials.");
}

function toDisplayPath(file) {
  return file.split(path.sep).join("/");
}

function topLevelOf(file) {
  const [first] = file.split(path.sep);
  return first || ".";
}

function languageFor(file) {
  const ext = path.extname(file).toLowerCase();
  const name = path.basename(file).toLowerCase();
  if ([".js", ".jsx", ".mjs", ".cjs"].includes(ext)) return "JavaScript";
  if ([".ts", ".tsx"].includes(ext)) return "TypeScript";
  if (ext === ".py") return "Python";
  if (ext === ".rs") return "Rust";
  if (ext === ".go") return "Go";
  if (ext === ".java") return "Java";
  if (ext === ".cs") return "C#";
  if ([".cpp", ".cc", ".cxx", ".c", ".h", ".hpp"].includes(ext)) return "C/C++";
  if ([".json", ".jsonc"].includes(ext)) return "JSON";
  if ([".md", ".mdx"].includes(ext)) return "Markdown";
  if ([".yml", ".yaml"].includes(ext)) return "YAML";
  if ([".html", ".css", ".scss", ".sass"].includes(ext)) return ext.slice(1).toUpperCase();
  if (name === "dockerfile") return "Docker";
  return ext ? ext.slice(1) : "Other";
}

function isRelevantFile(file) {
  const ext = path.extname(file).toLowerCase();
  const name = path.basename(file).toLowerCase();
  return [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".rs", ".go", ".java", ".cs", ".json", ".md", ".yml", ".yaml", ".toml", ".gradle", ".xml"].includes(ext)
    || ["package.json", "requirements.txt", "pyproject.toml", "cargo.toml", "go.mod", "pom.xml", "build.gradle", "dockerfile"].includes(name);
}

export function isIgnoredPath(relativePath) {
  const parts = relativePath.split(/[\\/]+/);
  return parts.some((part) => HEAVY_DIRS.has(part) || isSecretFile(part)) || isIgnoredContextPath(parts);
}

function isIgnoredContextPath(relativeParts) {
  return relativeParts.length >= 2 && relativeParts[0] === ".codex" && relativeParts[1] === "context";
}

export function isLikelyBinary(buffer) {
  if (buffer.length === 0) return false;
    let control = 0;
  for (let i = 0; i < buffer.length; i += 1) {
      const value = buffer[i];
      if (value === 0) return true;
      if (value < 7 || (value > 14 && value < 32)) control += 1;
    }
  return control / buffer.length > 0.2;
}

function isBinaryFile(file) {
  const buffer = Buffer.alloc(8000);
  const fd = fs.openSync(file, "r");
  try {
    const bytes = fs.readSync(fd, buffer, 0, buffer.length, 0);
    return isLikelyBinary(buffer.subarray(0, bytes));
  } finally {
    fs.closeSync(fd);
  }
}

function walk(root, dir, options, state, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (options.limit && files.length >= options.limit) return;
    const full = path.join(dir, entry.name);
    const relativeParts = path.relative(root, full).split(path.sep);
    if (entry.isDirectory()) {
      if (HEAVY_DIRS.has(entry.name) || isIgnoredContextPath(relativeParts)) {
        state.ignored += 1;
        continue;
      }
      walk(root, full, options, state, files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (isSecretFile(entry.name)) {
      state.ignored += 1;
      continue;
    }
    const stat = fs.statSync(full);
    if (stat.size > options.maxFileSizeBytes) {
      state.skippedLarge += 1;
      continue;
    }
    if (isBinaryFile(full)) {
      state.ignored += 1;
      continue;
    }
    files.push({ full, relative: path.relative(root, full), size: stat.size, mtimeMs: stat.mtimeMs, ext: path.extname(entry.name).toLowerCase() || "(none)" });
  }
}

export function getWatchDirs(root = process.cwd()) {
  const dirs = [];
  function visit(dir) {
    dirs.push(dir);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      const relativeParts = path.relative(root, full).split(path.sep);
      if (HEAVY_DIRS.has(entry.name) || isIgnoredContextPath(relativeParts)) continue;
      visit(full);
    }
  }
  visit(root);
  return dirs;
}

export function isIgnoredWorkspacePath(root, file) {
  const parts = path.relative(root, file).split(path.sep);
  return parts.some((part) => HEAVY_DIRS.has(part) || isSecretFile(part)) || isIgnoredContextPath(parts);
}

function scanProject(root, options = {}) {
  const state = { ignored: 0, skippedLarge: 0 };
  const files = [];
  const maxFileSizeKb = options.maxFileSizeKb ?? DEFAULT_MAX_FILE_SIZE_KB;
  walk(root, root, { maxFileSizeBytes: maxFileSizeKb * 1024, limit: options.limit }, state, files);
  return { root, files, ignored: state.ignored, skippedLarge: state.skippedLarge, maxFileSizeKb };
}

export function collectFiles(root = process.cwd(), options = {}) {
  return scanProject(root, options).files;
}

export function countEligibleFiles(root = process.cwd(), options = {}) {
  return scanProject(root, { ...options, limit: options.limit ?? 1000 }).files.length;
}

function readText(file) {
  return fs.readFileSync(file, "utf8");
}

function hashText(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function writeFileIfChanged(file, content) {
  if (fileExists(file) && hashText(fs.readFileSync(file)) === hashText(content)) return false;
  writeFileForce(file, content);
  return true;
}

function topLanguages(files) {
  const counts = new Map();
  for (const file of files) counts.set(file.language, (counts.get(file.language) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function extractImports(content, ext) {
  const imports = [];
  const pattern = /^\s*import\s+.*?\s+from\s+["'`]([^"'`]+)|^\s*import\s+["'`]([^"'`]+)|require\(\s*["'`]([^"'`]+)["'`]\s*\)|^\s*from\s+([A-Za-z0-9_.$-]+)\s+import|^\s*import\s+([A-Za-z0-9_.$-]+)/;
  if (![".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".go", ".java"].includes(ext)) return imports;
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(pattern);
    const name = match?.[1] || match?.[2] || match?.[3] || match?.[4] || match?.[5];
    if (name) imports.push(name);
  }
  return [...new Set(imports)].slice(0, 50);
}

export function extractExports(content, ext) {
  const exports = [];
  if ([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"].includes(ext)) {
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*export\s+(?:default\s+)?(?:(?:async\s+)?(?:function|class|const|let|var|type|interface)\s+)?([A-Za-z_$][\w$]*)?/);
      if (match) exports.push(match[1] || "default");
    }
  }
  return [...new Set(exports)].slice(0, 50);
}

export function extractSymbols(content, ext) {
  const symbols = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    let match;
    if ([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"].includes(ext)) {
      match = line.match(/^\s*(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const|let|var)\s+([A-Z][A-Za-z0-9_$]*|[A-Za-z_$][\w$]*)|^\s*(?:export\s+)?const\s+([A-Z][A-Za-z0-9_$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/);
    } else if (ext === ".py") {
      match = line.match(/^\s*(?:def|class)\s+([A-Za-z_]\w*)/);
    } else if (ext === ".go") {
      match = line.match(/^\s*(?:func|type)\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)|^\s*type\s+([A-Za-z_]\w*)\s+struct/);
    } else if (ext === ".java") {
      match = line.match(/^\s*(?:public\s+)?(?:class|interface)\s+([A-Za-z_]\w*)|^\s*public\s+(?:static\s+)?[\w<>\[\]]+\s+([A-Za-z_]\w*)\s*\(/);
    } else if ([".md", ".mdx"].includes(ext)) {
      match = line.match(/^(#{1,6})\s+(.+)/);
      if (match) symbols.push({ name: match[2].trim(), line: i + 1 });
      continue;
    }
    const name = match?.[1] || match?.[2];
    if (name) symbols.push({ name, line: i + 1 });
  }
  return symbols.slice(0, 80);
}

export function extractRouteHints(content, ext, relativePath = "") {
  const routeHints = [];
  const lines = content.split(/\r?\n/);
  const routePattern = /<(?:Route|Link|NavLink)\b[^>]*(?:path|to)=["'`]([^"'`]+)|\bpath\s*:\s*["'`]([^"'`]+)|(?:app|router)\.(?:get|post|put|patch|delete|use)\s*\(\s*["'`]([^"'`]+)|@(?:app|router)\.(?:get|post|put|patch|delete|route)\s*\(\s*["'`]([^"'`]+)|@app\.route\s*\(\s*["'`]([^"'`]+)/;
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(routePattern);
    const route = match?.[1] || match?.[2] || match?.[3] || match?.[4] || match?.[5];
    if (route) routeHints.push({ route, line: i + 1 });
  }
  const parts = relativePath.split(path.sep);
  if ((parts[0] === "pages" || parts[0] === "app" || parts.includes("pages") || parts.includes("app")) && [".js", ".jsx", ".ts", ".tsx", ".mdx"].includes(ext)) {
    routeHints.push({ route: nextRouteFromPath(relativePath), line: 1 });
  }
  return routeHints.slice(0, 50);
}

export function extractFileMetadata(filePath, content) {
  const ext = path.extname(filePath).toLowerCase();
  const testHints = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (/\b(describe|it|test)\s*\(|^\s*def\s+test_/.test(lines[i])) testHints.push({ line: i + 1 });
  }
  return {
    imports: extractImports(content, ext),
    exports: extractExports(content, ext),
    symbols: extractSymbols(content, ext),
    routeHints: extractRouteHints(content, ext, filePath),
    testHints: testHints.slice(0, 50)
  };
}

function nextRouteFromPath(file) {
  const parts = file.split(path.sep);
  const start = parts.indexOf("pages") >= 0 ? parts.indexOf("pages") : parts.indexOf("app");
  if (start < 0) return "";
  const routeParts = parts.slice(start + 1);
  const last = routeParts.pop() || "";
  const cleanLast = last.replace(/\.[^.]+$/, "");
  if (!["page", "route", "index"].includes(cleanLast)) routeParts.push(cleanLast);
  const route = routeParts.filter((part) => !part.startsWith("_") && !part.startsWith("(")).map((part) => part.replace(/\[(.+?)\]/g, ":$1")).join("/");
  return `/${route}`;
}

function enrichFiles(files) {
  return files.map((file) => {
    const content = readText(file.full);
    return { ...file, hash: hashText(content), language: languageFor(file.relative), ...extractFileMetadata(file.relative, content) };
  });
}

function groupedFilesMd(files) {
  const groups = new Map();
  for (const file of files.filter((item) => isRelevantFile(item.relative))) {
    const top = topLevelOf(file.relative);
    if (!groups.has(top)) groups.set(top, []);
    groups.get(top).push(file);
  }
  const rows = ["# Files", ""];
  for (const [top, group] of [...groups.entries()].sort()) {
    rows.push(`## ${toDisplayPath(top)}`, "");
    for (const file of group.slice(0, 80)) rows.push(`- ${toDisplayPath(file.relative)} (${file.language}, ${file.size} bytes)`);
    rows.push("");
  }
  return rows.join("\n").trimEnd() + "\n";
}

function symbolsMd(files) {
  const rows = ["# Symbols", ""];
  for (const file of files.filter((item) => item.symbols.length || item.exports.length).slice(0, 250)) {
    rows.push(`## ${toDisplayPath(file.relative)}`);
    if (file.symbols.length) rows.push(`- Symbols: ${file.symbols.map((item) => `${item.name}:${item.line}`).join(", ")}`);
    if (file.exports.length) rows.push(`- Exports: ${file.exports.join(", ")}`);
    rows.push("");
  }
  if (rows.length === 2) rows.push("None found.");
  return rows.join("\n").trimEnd() + "\n";
}

function routeHintsMd(files) {
  const rows = [];
  for (const file of files) {
    for (const hint of file.routeHints) rows.push(`- ${toDisplayPath(file.relative)}:${hint.line} ${hint.route}`);
  }
  return mdList("Routes", rows);
}

function collectDependencies(root, files) {
  const rows = ["# Dependencies", ""];
  const names = new Set(files.map((file) => path.basename(file.relative).toLowerCase()));
  const packageFile = path.join(root, "package.json");
  if (names.has("package.json") && fileExists(packageFile)) {
    try {
      const pkg = JSON.parse(readText(packageFile));
      const scripts = Object.keys(pkg.scripts || {});
      const dependencies = Object.keys(pkg.dependencies || {});
      const devDependencies = Object.keys(pkg.devDependencies || {});
      rows.push("## package.json", "");
      if (scripts.length) rows.push(`- scripts: ${scripts.join(", ")}`);
      if (dependencies.length) rows.push(`- dependencies: ${dependencies.join(", ")}`);
      if (devDependencies.length) rows.push(`- devDependencies: ${devDependencies.join(", ")}`);
      rows.push("");
    } catch {
      rows.push("## package.json", "", "- Could not parse package.json", "");
    }
  }
  for (const depFile of ["requirements.txt", "pyproject.toml", "Cargo.toml", "go.mod", "pom.xml", "build.gradle"]) {
    if (names.has(depFile.toLowerCase())) rows.push(`- ${depFile}`);
  }
  if (rows.length === 2) rows.push("None found.");
  return rows.join("\n").trimEnd() + "\n";
}

export function detectDependencies(root) {
  const found = [];
  for (const name of ["package.json", "requirements.txt", "pyproject.toml", "Cargo.toml", "go.mod", "pom.xml", "build.gradle"]) {
    const file = path.join(root, name);
    if (!fileExists(file)) continue;
    if (name === "package.json") {
      try {
        const pkg = JSON.parse(readText(file));
        found.push({
          file: name,
          scripts: Object.keys(pkg.scripts || {}),
          dependencies: Object.keys(pkg.dependencies || {}),
          devDependencies: Object.keys(pkg.devDependencies || {})
        });
      } catch {
        found.push({ file: name, error: "Could not parse package.json" });
      }
    } else {
      found.push({ file: name });
    }
  }
  return found;
}

function entrypointCandidates(files) {
  const names = ["src/index.ts", "src/index.js", "src/main.ts", "src/main.js", "src/App.tsx", "src/App.jsx", "app/page.tsx", "pages/index.tsx", "index.js", "server.js", "main.py", "app.py"];
  const lookup = new Set(files.map((file) => toDisplayPath(file.relative)));
  return names.filter((name) => lookup.has(name));
}

function testCandidates(files) {
  return files.filter((file) => /(^|[\\/.])(__tests__|tests?|spec)[\\/.]|(\.test|\.spec)\.[^.]+$/.test(toDisplayPath(file.relative))).map((file) => toDisplayPath(file.relative)).slice(0, 30);
}

function likelyProjectType(files) {
  const names = new Set(files.map((file) => toDisplayPath(file.relative)));
  if (names.has("next.config.js") || names.has("next.config.mjs") || [...names].some((name) => name.startsWith("app/") || name.startsWith("pages/"))) return "Next.js or React web app";
  if (names.has("package.json")) return "Node.js project";
  if (names.has("pyproject.toml") || names.has("requirements.txt")) return "Python project";
  if (names.has("Cargo.toml")) return "Rust project";
  if (names.has("go.mod")) return "Go project";
  return "Unknown";
}

function importantDirs(files) {
  const counts = new Map();
  for (const file of files) {
    const top = topLevelOf(file.relative);
    counts.set(top, (counts.get(top) || 0) + 1);
  }
  return [...counts.entries()].filter(([dir]) => dir !== ".").sort((a, b) => b[1] - a[1]).slice(0, 12).map(([dir, count]) => `${toDisplayPath(dir)} (${count})`);
}

function buildRunScripts(root) {
  const packageFile = path.join(root, "package.json");
  if (fileExists(packageFile)) {
    try {
      const pkg = JSON.parse(readText(packageFile));
      return Object.keys(pkg.scripts || {}).filter((name) => /^(dev|start|build|test|lint|check)$/.test(name)).map((name) => `npm run ${name}`);
    } catch {
      return [];
    }
  }
  return [];
}

function mdList(title, rows, empty = "None found.") {
  return `# ${title}\n\n${rows.length ? rows.join("\n") : empty}\n`;
}

function gitStatus(root) {
  try {
    const output = execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return output || "No changes.";
  } catch {
    return "Git status unavailable.";
  }
}

export function generateSummary(index) {
  const files = index._files || [];
  const languageRows = Object.entries(index.languageCounts || {}).slice(0, 8).map(([language, count]) => `- ${language}: ${count}`);
  const entries = entrypointCandidates(files);
  const tests = testCandidates(files);
  const scripts = buildRunScripts(index._root);
  const dirs = importantDirs(files);
  return `# Context Summary\n\n- Root: ${index.root}\n- Likely project type: ${likelyProjectType(files)}\n- Files indexed: ${index.fileCount}\n- Ignored entries: ${index.counts.ignored}\n- Skipped large files: ${index.counts.skippedLarge}\n\n## Primary Languages\n\n${languageRows.length ? languageRows.join("\n") : "None found."}\n\n## Important Directories\n\n${dirs.length ? dirs.map((dir) => `- ${dir}`).join("\n") : "None found."}\n\n## Entrypoint Candidates\n\n${entries.length ? entries.map((entry) => `- ${entry}`).join("\n") : "None found."}\n\n## Test Candidates\n\n${tests.length ? tests.map((test) => `- ${test}`).join("\n") : "None found."}\n\n## Build / Run Script Candidates\n\n${scripts.length ? scripts.map((script) => `- ${script}`).join("\n") : "None found."}\n`;
}

export function writeContextArtifacts(root, index) {
  const contextDir = path.join(root, ".codex", "context");
  const files = index._files || [];
  const artifacts = {
    "index.json": JSON.stringify({
      generatedAt: index.generatedAt,
      root: index.root,
      fileCount: index.fileCount,
      languageCounts: index.languageCounts,
      maxFileSizeKb: index.maxFileSizeKb,
      counts: index.counts,
      files: index.files
    }, null, 2),
    "summary.md": generateSummary(index),
    "symbols.md": symbolsMd(files),
    "files.md": groupedFilesMd(files),
    "routes.md": routeHintsMd(files),
    "dependencies.md": collectDependencies(root, files),
    "recent_changes.md": `# Recent Changes\n\n${gitStatus(root)}\n`
  };
  let written = 0;
  for (const [file, content] of Object.entries(artifacts)) {
    if (writeFileIfChanged(path.join(contextDir, file), content)) written += 1;
  }
  return { artifacts: Object.keys(artifacts).length, written };
}

export function runIndex(root = process.cwd(), options = {}) {
  const scan = scanProject(root, options);
  const files = enrichFiles(scan.files.sort((a, b) => a.relative.localeCompare(b.relative)));
  const languageCounts = Object.fromEntries(topLanguages(files));
  const index = {
    generatedAt: new Date().toISOString(),
    root: path.basename(root),
    fileCount: files.length,
    languageCounts,
    maxFileSizeKb: scan.maxFileSizeKb,
    counts: { files: files.length, ignored: scan.ignored, skippedLarge: scan.skippedLarge },
    files: files.map((file) => ({
        path: toDisplayPath(file.relative),
        ext: file.ext,
        size: file.size,
        hash: file.hash,
        imports: file.imports,
        exports: file.exports,
        symbols: file.symbols,
        routeHints: file.routeHints,
        testHints: file.testHints
      })),
    _files: files,
    _root: root
  };
  const artifactResult = writeContextArtifacts(root, index);
  const upgrade = runProjectUpgrade(root);
  return { root, filesIndexed: files.length, ignored: scan.ignored, skippedLarge: scan.skippedLarge, artifacts: artifactResult.artifacts, written: artifactResult.written, upgrade };
}

export function runContextIndex(root = process.cwd(), options = {}) {
  return runIndex(root, options);
}

export function runContextDoctor(root = process.cwd()) {
  const artifactResults = contextFiles.map((file) => {
    const found = fileExists(path.join(root, file));
    return { file, found, line: `${found ? "OK" : "MISSING"} ${file} ${found ? "found" : "missing"}` };
  });
  const indexPath = path.join(root, ".codex", "context", "index.json");
  let generatedAt = "unavailable";
  let fileCount = "unavailable";
  if (fileExists(indexPath)) {
    try {
      const index = JSON.parse(readText(indexPath));
      generatedAt = index.generatedAt || "unavailable";
      fileCount = Number.isInteger(index.fileCount) ? String(index.fileCount) : "unavailable";
    } catch {
      generatedAt = "invalid index.json";
      fileCount = "invalid index.json";
    }
  }
  const agentsPath = path.join(root, ".codex", "AGENTS.md");
  const agentsReferencesContext = fileExists(agentsPath) && readText(agentsPath).includes("Precomputed Context Engine");
  const results = [
    ...artifactResults,
    { file: "fileCount", found: fileCount !== "unavailable" && fileCount !== "invalid index.json", line: `INFO file count ${fileCount}` },
    { file: "generatedAt", found: generatedAt !== "unavailable" && generatedAt !== "invalid index.json", line: `INFO generatedAt ${generatedAt}` },
    {
      file: path.join(".codex", "AGENTS.md"),
      found: agentsReferencesContext,
      line: `${agentsReferencesContext ? "OK" : "MISSING"} .codex/AGENTS.md references context engine`
    }
  ];
  return { ok: artifactResults.every((result) => result.found) && agentsReferencesContext, results };
}

export function runContextClean(root = process.cwd()) {
  const dir = path.join(root, ".codex", "context");
  if (!fileExists(dir)) return { removed: false, dir };
  fs.rmSync(dir, { recursive: true, force: true });
  return { removed: true, dir };
}
