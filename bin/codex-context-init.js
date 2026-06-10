#!/usr/bin/env node

import { runDoctor, runNew, runSync, runUpgrade } from "../src/core.js";

function usage(code = 0) {
  console.log(`Usage:
  codex-context-init new <project-name> [--force]
  codex-context-init sync
  codex-context-init doctor
  codex-context-init upgrade`);
  process.exit(code);
}

const [command, projectName, ...rest] = process.argv.slice(2);
const options = { force: rest.includes("--force") };

try {
  switch (command) {
    case "new": {
      const result = runNew(projectName, options);
      console.log(`Created ${result.root}`);
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
