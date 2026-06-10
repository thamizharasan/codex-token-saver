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

## Commands

```sh
codex-context-init global
codex-context-init global doctor
codex-context-init new <project-name> [--force]
codex-context-init sync
codex-context-init doctor
codex-context-init upgrade
codex-context-init project doctor
codex-context-init project upgrade
```

## Recommended first-time setup

```sh
codex-context-init global
codex-context-init new my-app
cd my-app
codex-context-init doctor
```

## Existing project setup

```sh
cd existing-repo
codex-context-init sync
codex-context-init project upgrade
codex-context-init project doctor
```

## VS Code usage

- Run `Codex Context: Setup Global Instructions` once per machine.
- Run `Codex Context: Sync Current Workspace` per repository.
- Run `Codex Context: Doctor Current Workspace` to check project files.
- Run `Codex Context: Doctor Global Instructions` to check global setup.
- Run `Codex Context: Upgrade AGENTS.md` to update project rules.

## Safety behavior around overwrites

- `global` preserves existing global content outside managed markers.
- `project upgrade` preserves existing project content outside managed markers.
- `sync` creates missing files only.
- `new <project-name>` skips existing files unless `--force` is passed.
- `doctor` commands only report status.
