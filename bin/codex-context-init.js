#!/usr/bin/env node

import {
  getWatchDirs,
  isIgnoredWorkspacePath,
  runDoctor,
  runContextClean,
  runContextDoctor,
  runContextIndex,
  runGlobalDoctor,
  runGlobalSetup,
  runNew,
  runProjectDoctor,
  runProjectUpgrade,
  runSync,
  runUpgrade
} from "../src/core.js";
import fs from "node:fs";
import path from "node:path";

function usage(code = 0) {
  console.log(`Usage:
  codex-context-init new <project-name> [--force]
  codex-context-init global [doctor]
  codex-context-init project <upgrade|doctor>
  codex-context-init index [--watch]
  codex-context-init context <doctor|clean>
  codex-context-init sync
  codex-context-init doctor
  codex-context-init upgrade`);
  process.exit(code);
}

const [command, subcommand, ...rest] = process.argv.slice(2);
const options = { force: rest.includes("--force") };

function printIndexResult(result) {
  console.log(`Indexed ${result.filesIndexed} file(s)`);
  console.log(`Wrote ${result.written} changed context artifact(s)`);
  console.log(`Skipped ${result.skippedLarge} large file(s)`);
  console.log(`Ignored ${result.ignored} file(s) or directories`);
}

function runWatch() {
  let timer;
  const root = process.cwd();
  const index = () => {
    const result = runContextIndex();
    printIndexResult(result);
  };
  index();
  for (const dir of getWatchDirs()) {
    fs.watch(dir, (_event, filename) => {
      if (filename && isIgnoredWorkspacePath(root, path.join(dir, filename.toString()))) return;
      clearTimeout(timer);
      timer = setTimeout(index, 1000);
    });
  }
  console.log("Watching for changes. Press Ctrl+C to stop.");
}

try {
  switch (command) {
    case "new": {
      const result = runNew(subcommand, options);
      console.log(`Created ${result.root}`);
      break;
    }
    case "global": {
      if (subcommand === "doctor") {
        const result = runGlobalDoctor();
        for (const item of result.results) console.log(item.line);
        process.exit(result.ok ? 0 : 1);
      }
      if (subcommand) usage(1);
      const result = runGlobalSetup();
      console.log(`${result.action === "created" ? "Created" : "Updated"} ~/.codex/AGENTS.md`);
      break;
    }
    case "project": {
      if (subcommand === "upgrade") {
        const result = runProjectUpgrade();
        console.log(`${result.action === "created" ? "Created" : "Updated"} .codex/AGENTS.md`);
        break;
      }
      if (subcommand === "doctor") {
        const result = runProjectDoctor();
        for (const item of result.results) console.log(item.line);
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
      const result = runContextIndex();
      printIndexResult(result);
      break;
    }
    case "context": {
      if (subcommand === "doctor") {
        const result = runContextDoctor();
        for (const item of result.results) console.log(item.line);
        process.exit(result.ok ? 0 : 1);
      }
      if (subcommand === "clean") {
        const result = runContextClean();
        console.log(`${result.removed ? "Removed" : "No context directory at"} .codex/context`);
        break;
      }
      usage(1);
      break;
    }
    case "sync": {
      const result = runSync();
      console.log(`Created ${result.created} missing file(s)`);
      break;
    }
    case "doctor": {
      const result = runDoctor();
      for (const item of result.results) console.log(item.line);
      process.exit(result.ok ? 0 : 1);
      break;
    }
    case "upgrade": {
      const result = runUpgrade();
      console.log(`${result.action === "created" ? "Created" : "Updated"} .codex/AGENTS.md`);
      break;
    }
    default:
      usage(command ? 1 : 0);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
