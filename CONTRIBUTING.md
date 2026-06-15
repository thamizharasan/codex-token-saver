# Contributing to Codex Token Saver

Thank you for your interest in contributing to Codex Token Saver.

## Overview

Codex Token Saver helps AI coding agents spend less time exploring repositories and more time solving problems by generating deterministic, local-first repository context.

Our guiding principles are:

* **Local First** – No cloud services required for core functionality.
* **Deterministic by Default** – Generated context should be predictable, explainable, and reproducible.
* **Reliability Over Complexity** – Prefer simple, maintainable solutions.
* **Source Code Is the Source of Truth** – Generated context assists developers and AI agents but should never override actual code.

---

## Ways to Contribute

We welcome contributions in the following areas:

* Bug fixes
* Documentation improvements
* Parser enhancements
* Query relevance improvements
* Performance optimizations
* VS Code extension improvements
* Testing and diagnostics

Before proposing a feature, consider:

* Does it improve context quality?
* Does it reduce repository exploration?
* Does it maintain simplicity and reliability?
* Does it align with the project's local-first philosophy?

---

## Development Setup

```bash
git clone https://github.com/thamizharasan/codex-token-saver.git
cd codex-token-saver
npm install
npm test
```

Test the CLI locally:

```bash
npm link
codex-context-init --help
```

---

## Project Structure

```text
src/
  core/
    engine/
    services/
    parsers/
    scoring/
    utils/

  extension/

bin/
test/
```

The CLI and VS Code extension should remain thin wrappers around shared core functionality.

---

## Development Guidelines

### Keep It Simple

Prefer straightforward, maintainable solutions over complex abstractions.

### Minimize Dependencies

Use the Node.js standard library whenever practical.

### Cross-Platform Support

All contributions should work on:

* Windows
* macOS
* Linux

Use platform-safe APIs such as:

```js
path.join(...)
```

---

## Testing

Run tests before submitting changes:

```bash
npm test
```

Please add or update tests for meaningful functionality changes.

---

## Pull Requests

Before opening a PR:

* Run tests
* Keep changes focused
* Update documentation if needed
* Preserve backward compatibility where possible

Small, focused pull requests are preferred.

---

## Areas of Interest

Current areas where contributions are especially valuable:

* Parser improvements
* Query relevance scoring
* Monorepo support
* Context freshness detection
* Benchmarking and diagnostics
* Documentation exports
* Optional semantic search integrations

---

## Thank You

Every contribution—whether it's a bug fix, documentation update, or new feature—helps improve how developers and AI agents work together.
