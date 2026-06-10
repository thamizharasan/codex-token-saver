# codex-context-init

Reusable Node.js CLI and VS Code extension for Codex context-compression files.

## Installation

```sh
npm install -g codex-context-init
```

## Local usage with npm link

```sh
npm link
codex-context-init global
```

## Global vs project setup

- Global setup writes machine-wide Codex rules to `~/.codex/AGENTS.md`.
- Project setup writes repository context files and project rules to `.codex/AGENTS.md`.
- Global rules are for token-saving defaults.
- Project rules point Codex at repository-specific context sources.

## What the Context Engine does

The Context Engine pre-indexes a project locally and writes compact artifacts under `.codex/context/`. Codex can read these files first to understand likely project type, important files, symbols, dependencies, routes, and recent git changes before opening source files.

## Why generated files instead of direct agent injection

Codex does not need runtime injection for this workflow. Generated files plus `.codex/AGENTS.md` instructions are portable, reviewable, local-only, and work across CLI, VS Code, and normal repository workflows.

## Commands

```sh
codex-context-init global
codex-context-init global doctor
codex-context-init new <project-name> [--force]
codex-context-init index
codex-context-init index --watch
codex-context-init context doctor
codex-context-init context clean
codex-context-init sync
codex-context-init doctor
codex-context-init upgrade
codex-context-init project doctor
codex-context-init project upgrade
```

## Expected command output

### `codex-context-init global`

```txt
Created ~/.codex/AGENTS.md
```

or:

```txt
Updated ~/.codex/AGENTS.md
```

### `codex-context-init global doctor`

```txt
OK ~/.codex/AGENTS.md found
OK global managed block found
```

If setup is missing, one or more lines begin with `MISSING` and the command exits with code `1`.

### `codex-context-init new <project-name> [--force]`

```txt
Created /absolute/path/to/project-name
```

Creates project context files and `.codex/AGENTS.md`. Existing files are skipped unless `--force` is passed.

### `codex-context-init sync`

```txt
Created 3 missing file(s)
```

The count may be `0`. Existing files are never overwritten.

### `codex-context-init doctor`

```txt
OK .codex/AGENTS.md found
OK .codex/templates/project_context.template.md found
OK .codex/templates/architecture.template.md found
OK .codex/templates/task.template.md found
OK .codex/templates/decision_log.template.md found
OK project_context.md found
OK architecture.md found
OK task.md found
OK decision_log.md found
```

Missing files are reported with `MISSING`; exit code is `1` if any required file is missing.

### `codex-context-init upgrade`

```txt
Updated .codex/AGENTS.md
```

or:

```txt
Created .codex/AGENTS.md
```

### `codex-context-init project doctor`

Same output and exit-code behavior as `codex-context-init doctor`.

### `codex-context-init project upgrade`

Same output and behavior as `codex-context-init upgrade`.

### `codex-context-init index`

```txt
Indexed 42 file(s)
Wrote 7 changed context artifact(s)
Skipped 1 large file(s)
Ignored 5 file(s) or directories
```

Also upgrades `.codex/AGENTS.md` so Codex reads generated context first.

### `codex-context-init index --watch`

```txt
Indexed 42 file(s)
Wrote 7 changed context artifact(s)
Skipped 1 large file(s)
Ignored 5 file(s) or directories
Watching for changes. Press Ctrl+C to stop.
```

After file changes, the index output repeats after a 1000ms debounce.

### `codex-context-init context doctor`

```txt
OK .codex/context/index.json found
OK .codex/context/summary.md found
OK .codex/context/symbols.md found
OK .codex/context/files.md found
OK .codex/context/routes.md found
OK .codex/context/dependencies.md found
OK .codex/context/recent_changes.md found
INFO file count 42
INFO generatedAt 2026-06-11T10:00:00.000Z
OK .codex/AGENTS.md references context engine
```

Missing artifacts are reported with `MISSING`; exit code is `1` if required artifacts or the AGENTS.md context reference are missing.

### `codex-context-init context clean`

```txt
Removed .codex/context
```

or:

```txt
No context directory at .codex/context
```

## Recommended first-time setup

```sh
codex-context-init global
codex-context-init new my-app
cd my-app
codex-context-init doctor
codex-context-init index
codex-context-init context doctor
```

## Codex workflow

```sh
codex-context-init global
codex-context-init sync
codex-context-init index
codex-context-init project upgrade
```

## Existing project setup

```sh
cd existing-repo
codex-context-init sync
codex-context-init project upgrade
codex-context-init index
codex-context-init project doctor
```

## VS Code usage

- Run `Codex Context: Setup Global Instructions` once per machine.
- Run `Codex Context: Sync Current Workspace` per repository.
- Run `Codex Context: Index Current Workspace` to generate `.codex/context` artifacts.
- Run `Codex Context: Doctor Current Workspace` to check project files.
- Run `Codex Context: Doctor Context Artifacts` to check generated artifacts.
- Run `Codex Context: Doctor Global Instructions` to check global setup.
- Run `Codex Context: Upgrade AGENTS.md` to update project rules.

## VS Code workflow

1. Install extension.
2. Open project.
3. Run `Codex Context: Index Current Workspace`.
4. Ask Codex normally.

## Context engine

`codex-context-init index` scans the current project locally and writes:

```txt
.codex/context/index.json
.codex/context/summary.md
.codex/context/symbols.md
.codex/context/files.md
.codex/context/routes.md
.codex/context/dependencies.md
.codex/context/recent_changes.md
```

The indexer ignores common heavy directories, secrets, binary files, and files larger than the configured max size. No code is sent outside the machine.

`index.json` includes generated time, root name, file count, language counts, and per-file hashes, imports, exports, symbols, route hints, and test hints. Markdown artifacts are deterministic summaries for Codex to read before opening repository files.

`recent_changes.md` uses `git status --short` when available and writes `Git status unavailable.` when git is unavailable.

## Limitations

- Heuristic parser.
- No embeddings in v1.
- Generated context may be stale.
- Source code remains source of truth.

## Safety behavior around overwrites

- `global` preserves existing global content outside managed markers.
- `project upgrade` preserves existing project content outside managed markers.
- `sync` creates missing files only.
- `new <project-name>` skips existing files unless `--force` is passed.
- `doctor` commands only report status.
- `context clean` deletes only `.codex/context`.
