#!/usr/bin/env node

import {
  runDoctor,
  runGlobalDoctor,
  runGlobalSetup,
  runNew,
  runProjectDoctor,
  runProjectUpgrade,
  runSync,
  runUpgrade
} from "../src/core.js";

function usage(code = 0) {
  console.log(`Usage:
  codex-context-init new <project-name> [--force]
  codex-context-init global [doctor]
  codex-context-init project <upgrade|doctor>
  codex-context-init sync
  codex-context-init doctor
  codex-context-init upgrade`);
  process.exit(code);
}

const [command, subcommand, ...rest] = process.argv.slice(2);
const options = { force: rest.includes("--force") };

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
