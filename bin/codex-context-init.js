#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  getWatchDirs,
  isIgnoredWorkspacePath,
  runContextClean,
  runContextDoctor,
  runDebug,
  runContextIndex,
  runDoctor,
  runGlobalDoctor,
  runGlobalSetup,
  runNew,
  runProjectDoctor,
  runProjectUpgrade,
  runQuery,
  runSync,
  runUpgrade
} from "../src/core.js";
import { createLogger } from "../src/core/logger.js";

const rawArgs = process.argv.slice(2);
const verbose = rawArgs.includes("--verbose");
const args = rawArgs.filter((arg) => arg !== "--verbose");
const [command, subcommand, ...rest] = args;
const options = { force: rest.includes("--force") };
const logger = createLogger({ verbose });

if (!command || command === "--help" || command === "-h" || command === "help") usage(0);

function usage(code = 0) {
  logger.info(`Usage:
  codex-context-init new <project-name> [--force]
  codex-context-init global [doctor]
  codex-context-init project <upgrade|doctor>
  codex-context-init index [--watch]
  codex-context-init context <doctor|clean>
  codex-context-init query "<question>" [--top 10]
  codex-context-init sync
  codex-context-init doctor
  codex-context-init debug
  codex-context-init upgrade`);
  process.exit(code);
}

function printIndexResult(result) {
  logger.info(`Indexed ${result.filesIndexed} file(s)`);
  logger.info(`Wrote ${result.written} changed context artifact(s)`);
  logger.info(`Skipped ${result.skippedLarge} large file(s)`);
  logger.info(`Ignored ${result.ignored} file(s) or directories`);
}

function runWatch() {
  let timer;
  const root = process.cwd();
  const index = () => printIndexResult(runContextIndex());
  index();
  for (const dir of getWatchDirs()) {
    fs.watch(dir, (_event, filename) => {
      if (filename && isIgnoredWorkspacePath(root, path.join(dir, filename.toString()))) return;
      clearTimeout(timer);
      timer = setTimeout(index, 1000);
    });
  }
  logger.info("Watching for changes. Press Ctrl+C to stop.");
}

try {
  switch (command) {
    case "new": {
      const result = runNew(subcommand, options);
      logger.info(`Created ${result.root}`);
      break;
    }
    case "global": {
      if (subcommand === "doctor") {
        const result = runGlobalDoctor();
        for (const item of result.results) logger.info(item.line);
        process.exit(result.ok ? 0 : 1);
      }
      if (subcommand) usage(1);
      const result = runGlobalSetup();
      logger.info(`${result.action === "created" ? "Created" : "Updated"} ~/.codex/AGENTS.md`);
      break;
    }
    case "project": {
      if (subcommand === "upgrade") {
        const result = runProjectUpgrade();
        logger.info(`${result.action === "created" ? "Created" : "Updated"} .codex/AGENTS.md`);
        break;
      }
      if (subcommand === "doctor") {
        const result = runProjectDoctor();
        for (const item of result.results) logger.info(item.line);
        process.exit(result.ok ? 0 : 1);
      }
      usage(1);
      break;
    }
    case "index": {
      if (subcommand === "--watch" || rest.includes("--watch")) {
        runWatch();
        break;
      }
      printIndexResult(runContextIndex());
      break;
    }
    case "context": {
      if (subcommand === "doctor") {
        const result = runContextDoctor();
        for (const item of result.results) logger.info(item.line);
        process.exit(result.ok ? 0 : 1);
      }
      if (subcommand === "clean") {
        const result = runContextClean();
        logger.info(`${result.removed ? "Removed" : "No context directory at"} .codex/context`);
        break;
      }
      usage(1);
      break;
    }
    case "query": {
      const topIndex = rest.indexOf("--top");
      const top = topIndex >= 0 ? rest[topIndex + 1] : undefined;
      const result = runQuery(process.cwd(), subcommand, { top });
      logger.info(`Wrote ${result.relevantPath}`);
      for (const match of result.matches) logger.info(`${match.score} ${match.path}`);
      break;
    }
    case "sync": {
      const result = runSync();
      logger.info(`Created ${result.created} missing file(s)`);
      break;
    }
    case "doctor": {
      const result = runDoctor();
      for (const item of result.results) logger.info(item.line);
      process.exit(result.ok ? 0 : 1);
      break;
    }
    case "debug": {
      const result = runDebug();
      for (const item of result.results) logger.info(item.line);
      process.exit(result.ok ? 0 : 1);
      break;
    }
    case "upgrade": {
      const result = runUpgrade();
      logger.info(`${result.action === "created" ? "Created" : "Updated"} .codex/AGENTS.md`);
      break;
    }
    default:
      usage(command ? 1 : 0);
  }
} catch (error) {
  logger.error(error);
  process.exit(1);
}
