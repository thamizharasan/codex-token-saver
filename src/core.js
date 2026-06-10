import fs from "node:fs";
import path from "node:path";

export const START = "<!-- CODEX-CONTEXT-INIT:START -->";
export const END = "<!-- CODEX-CONTEXT-INIT:END -->";

export const managedBlock = `${START}
# Codex Agent Instructions

You are operating in AGGRESSIVE TOKEN OPTIMIZATION MODE.

## Primary Goal

Complete the requested coding task with the fewest tokens, fewest file reads, smallest diff, and shortest response possible.

## Context Source Priority

Before exploring the repository, read these files in order:

1. task.md
2. architecture.md
3. decision_log.md
4. project_context.md

Use these files as the compressed source of truth.

Do not scan the repository until these context files have been checked.

## Context Rules

- Read the minimum files required.
- Prefer targeted search over broad exploration.
- Never scan the whole repository unless explicitly requested.
- Stop reading once enough context is found.
- Do not open unrelated files.
- Do not inspect tests unless modifying tested behavior or validation requires it.
- Use existing open files, visible errors, and user-provided context first.

## Editing Rules

- Make the smallest correct change.
- Prefer local fixes over refactors.
- Reuse existing patterns exactly.
- Do not introduce new abstractions unless required.
- Do not rename, reformat, or reorganize unrelated code.
- Avoid dependency changes unless essential.
- Avoid comments unless they clarify non-obvious logic.

## Planning Rules

- For simple tasks, edit immediately.
- Only create a plan when touching 3+ files, changing architecture, or resolving ambiguity.
- Plans must be at most 3 bullets.

## Documentation Rules

- Update task.md after meaningful progress.
- Update decision_log.md only when a technical decision is made.
- Update architecture.md only when structure, dependencies, boundaries, or data flow change.
- Update project_context.md only when product goals, constraints, or scope change.
- Do not generate extra documentation unless requested.

## Validation Rules

- Run only the narrowest relevant check.
- Prefer targeted tests over full test suites.
- Do not run expensive commands unless necessary.
- Use quiet flags when available.
- If validation is skipped, say why in one short sentence.

## Response Format

Return only:

CHANGED
- path/to/file

VALIDATION
- command or "not run"

DONE

No extra explanation.
${END}`;

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

function filesFor(root) {
  return {
    [path.join(root, ".codex", "AGENTS.md")]: managedBlock,
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

export function runDoctor(root = process.cwd()) {
  const results = requiredFiles.map((file) => {
    const found = fileExists(path.join(root, file));
    return { file, found, line: `${found ? "✓" : "✗"} ${file} ${found ? "found" : "missing"}` };
  });
  return { ok: results.every((result) => result.found), results };
}

export function runUpgrade(root = process.cwd()) {
  const file = path.join(root, ".codex", "AGENTS.md");
  if (!fileExists(file)) {
    writeFileForce(file, managedBlock);
    return { file, action: "created" };
  }

  const existing = fs.readFileSync(file, "utf8");
  const start = existing.indexOf(START);
  const end = existing.indexOf(END);
  const next = start >= 0 && end > start
    ? existing.slice(0, start) + managedBlock + existing.slice(end + END.length)
    : `${existing.trimEnd()}\n\n${managedBlock}\n`;

  writeFileForce(file, next);
  return { file, action: "updated" };
}
