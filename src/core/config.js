import path from "node:path";

export const OLD_START = "<!-- CODEX-CONTEXT-INIT:START -->";
export const OLD_END = "<!-- CODEX-CONTEXT-INIT:END -->";
export const PROJECT_START = "<!-- CODEX-CONTEXT-INIT:PROJECT:START -->";
export const PROJECT_END = "<!-- CODEX-CONTEXT-INIT:PROJECT:END -->";
export const GLOBAL_START = "<!-- CODEX-CONTEXT-INIT:GLOBAL:START -->";
export const GLOBAL_END = "<!-- CODEX-CONTEXT-INIT:GLOBAL:END -->";

export const DEFAULT_MAX_FILE_SIZE_KB = 300;
export const SCHEMA_VERSION = 2;
export const GENERATOR_VERSION = "0.1.0";
export const HEAVY_DIRS = new Set(["node_modules", ".git", "dist", "build", "out", "coverage", ".next", ".nuxt", "target", "vendor", ".venv", "__pycache__"]);
export const CONTEXT_FILES = ["index.json", "summary.md", "symbols.md", "files.md", "routes.md", "dependencies.md", "recent_changes.md"];
export const RELEVANT_CONTEXT_FILE = "relevant.md";
export const SECRET_FILE_NAMES = new Set([".env", "id_rsa", "id_ed25519"]);
export const SECRET_PREFIXES = [".env.", "secrets.", "credentials."];
export const SECRET_SUFFIXES = [".pem", ".key"];
export const DEPENDENCY_FILES = ["package.json", "requirements.txt", "pyproject.toml", "Cargo.toml", "go.mod", "pom.xml", "build.gradle"];
export const RELEVANT_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".rs", ".go", ".java", ".cs", ".json", ".md", ".yml", ".yaml", ".toml", ".gradle", ".xml"]);
export const RELEVANT_FILE_NAMES = new Set([...DEPENDENCY_FILES.map((file) => file.toLowerCase()), "dockerfile"]);

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

1. .codex/context/relevant.md
2. .codex/context/summary.md
3. .codex/context/dependencies.md
4. .codex/context/files.md
5. .codex/context/symbols.md
6. .codex/context/routes.md
7. .codex/context/recent_changes.md
8. .codex/context/index.json

If \`.codex/context/relevant.md\` exists, treat it as the task-specific context shortlist generated from the user's latest query.

Use these as pre-indexed repository context.

Rules:
- Prefer these files before scanning directories.
- Use importance scores to identify likely relevant files.
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

export const templates = {
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
