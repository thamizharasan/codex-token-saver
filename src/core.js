import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const OLD_START = "<!-- CODEX-CONTEXT-INIT:START -->";
export const OLD_END = "<!-- CODEX-CONTEXT-INIT:END -->";
export const PROJECT_START = "<!-- CODEX-CONTEXT-INIT:PROJECT:START -->";
export const PROJECT_END = "<!-- CODEX-CONTEXT-INIT:PROJECT:END -->";
export const GLOBAL_START = "<!-- CODEX-CONTEXT-INIT:GLOBAL:START -->";
export const GLOBAL_END = "<!-- CODEX-CONTEXT-INIT:GLOBAL:END -->";

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

## Context Source Priority

Before exploring the repository, read these files in order:

1. task.md
2. architecture.md
3. decision_log.md
4. project_context.md

Use these files as the compressed project source of truth.

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
  ".codex/AGENTS.md",
  ".codex/templates/project_context.template.md",
  ".codex/templates/architecture.template.md",
  ".codex/templates/task.template.md",
  ".codex/templates/decision_log.template.md",
  "project_context.md",
  "architecture.md",
  "task.md",
  "decision_log.md"
];

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

  if (hasStart !== hasEnd) {
    return { ok: false, error: "Managed block has only one marker." };
  }

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
    return { file, found, line: `${found ? "✓" : "✗"} ${file} ${found ? "found" : "missing"}` };
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
    { found: exists, line: `${exists ? "✓" : "✗"} ~/.codex/AGENTS.md ${exists ? "found" : "missing"}` },
    { found: hasBlock, line: `${hasBlock ? "✓" : "✗"} global managed block ${hasBlock ? "found" : "missing"}` }
  ];
  return { ok: results.every((result) => result.found), results };
}
