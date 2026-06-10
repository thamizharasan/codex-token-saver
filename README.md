# codex-token-saver
A quickstart app to create new projects with template files and Codex instructions to reduce token usage for vibe coding small applications without losing context.

# codex-context-init

Reusable Node.js CLI for initializing and maintaining Codex context-compression files across repositories.

## Installation

```sh
npm install -g codex-context-init
```

## Local usage with npm link

```sh
npm link
codex-context-init new my-project
```

## Commands

```sh
codex-context-init new <project-name> [--force]
codex-context-init sync
codex-context-init doctor
codex-context-init upgrade
```

## VS Code Commands

- Codex Context: New Project
- Codex Context: Sync Current Workspace
- Codex Context: Doctor Current Workspace
- Codex Context: Upgrade AGENTS.md

## Examples

```sh
codex-context-init new app
cd app
codex-context-init doctor
codex-context-init sync
codex-context-init upgrade
```

## Safety behavior around overwrites

- `new <project-name>` creates required files and skips existing files.
- `new <project-name> --force` overwrites generated files in the new project.
- `sync` creates missing files only.
- `sync` never overwrites `.codex/AGENTS.md` or project context files.
- `doctor` only reports missing files.
- `upgrade` modifies only `.codex/AGENTS.md` and only updates the managed block.
