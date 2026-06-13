const path = require("node:path");
const vscode = require("vscode");

let corePromise;

function loadCore() {
  if (!corePromise) corePromise = import("../core.js");
  return corePromise;
}

function workspaceRoot() {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function requireWorkspace() {
  const root = workspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage("Codex Context: open a workspace folder first.");
    throw new Error("Open a workspace folder first.");
  }
  return root;
}

function maxFileSizeKb() {
  return vscode.workspace.getConfiguration("codexContext").get("maxFileSizeKb", 300);
}

async function handleCommand(output, action) {
  try {
    const core = await loadCore();
    const logger = core.createLogger({
      root: workspaceRoot() ?? process.cwd(),
      sink: {
        log: (message) => output.appendLine(message),
        warn: (message) => output.appendLine(message),
        error: (message) => output.appendLine(message)
      }
    });
    await action(core, logger);
  } catch (error) {
    output.appendLine(error instanceof Error ? error.message : String(error));
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}

function writeIndexReport(output, logger, result) {
  output.clear();
  logger.info("indexing started");
  logger.info(`${result.filesIndexed} files indexed`);
  logger.info(`${result.written} artifacts written`);
  logger.info(`${result.skippedLarge} skipped large files count`);
  logger.info(`${result.ignored} ignored files count`);
  output.show();
}

function activate(context) {
  const output = vscode.window.createOutputChannel("Codex Context");

  context.subscriptions.push(
    output,
    vscode.commands.registerCommand("codexContext.newProject", () => handleCommand(output, async (core) => {
      const name = await vscode.window.showInputBox({ prompt: "Project name" });
      if (!name) return;
      const parent = workspaceRoot() ?? process.cwd();
      const result = core.runNew(path.join(parent, name));
      vscode.window.showInformationMessage(`Codex Context: created ${result.root}`);
    })),
    vscode.commands.registerCommand("codexContext.syncWorkspace", () => handleCommand(output, (core) => {
      const result = core.runSync(requireWorkspace());
      vscode.window.showInformationMessage(`Codex Context: created ${result.created} missing file(s)`);
    })),
    vscode.commands.registerCommand("codexContext.doctorWorkspace", () => handleCommand(output, (core) => {
      const result = core.runProjectDoctor(requireWorkspace());
      output.clear();
      output.appendLine("Codex Context Doctor");
      output.appendLine("");
      for (const item of result.results) output.appendLine(item.line);
      output.show();
    })),
    vscode.commands.registerCommand("codexContext.upgradeAgents", () => handleCommand(output, (core) => {
      const result = core.runProjectUpgrade(requireWorkspace());
      vscode.window.showInformationMessage(`Codex Context: ${result.action} .codex/AGENTS.md`);
    })),
    vscode.commands.registerCommand("codexContext.setupGlobal", () => handleCommand(output, (core) => {
      const result = core.runGlobalSetup();
      vscode.window.showInformationMessage(`Codex Context: ${result.action} global AGENTS.md`);
    })),
    vscode.commands.registerCommand("codexContext.doctorGlobal", () => handleCommand(output, (core) => {
      const result = core.runGlobalDoctor();
      output.clear();
      output.appendLine("Codex Context Global Doctor");
      output.appendLine("");
      for (const item of result.results) output.appendLine(item.line);
      output.show();
    })),
    vscode.commands.registerCommand("codexContext.indexWorkspace", () => handleCommand(output, (core, logger) => {
      output.clear();
      logger.info("indexing started");
      output.show();
      const result = core.runContextIndex(requireWorkspace(), { maxFileSizeKb: maxFileSizeKb() });
      writeIndexReport(output, logger, result);
      vscode.window.showInformationMessage("Codex Context: artifacts written");
    })),
    vscode.commands.registerCommand("codexContext.contextDoctor", () => handleCommand(output, (core) => {
      const result = core.runContextDoctor(requireWorkspace());
      output.clear();
      output.appendLine("Codex Context Artifact Doctor");
      output.appendLine("");
      for (const item of result.results) output.appendLine(item.line);
      output.show();
    })),
    vscode.commands.registerCommand("codexContext.queryRelevant", () => handleCommand(output, async (core) => {
      const question = await vscode.window.showInputBox({ prompt: "What are you trying to change or understand?" });
      if (!question) return;
      const result = core.runQuery(requireWorkspace(), question);
      output.clear();
      output.appendLine("Codex Context Query");
      output.appendLine("");
      output.appendLine(`Query: ${result.question}`);
      output.appendLine("");
      for (const match of result.matches) output.appendLine(`${match.score} ${match.path}`);
      output.show();
      vscode.window.showInformationMessage("Codex Context: relevant context written");
    }))
  );

  loadCore().then((core) => {
    if (vscode.workspace.getConfiguration("codexContext").get("autoIndex", false)) {
      const root = workspaceRoot();
      if (root) {
        const count = core.countEligibleFiles(root, { maxFileSizeKb: maxFileSizeKb() });
        if (count < 1000) {
          vscode.window.showInformationMessage("Index Codex Context now?", "Index").then((choice) => {
            if (choice === "Index") vscode.commands.executeCommand("codexContext.indexWorkspace");
          });
        } else {
          vscode.window.showInformationMessage("Use Codex Context: Index Current Workspace when ready.");
        }
      }
    }

    if (vscode.workspace.getConfiguration("codexContext").get("watch", false)) {
      const root = workspaceRoot();
      if (root) {
        let timer;
        const watcher = vscode.workspace.createFileSystemWatcher("**/*");
        const schedule = (uri) => {
          if (core.isIgnoredWorkspacePath(root, uri.fsPath)) return;
          clearTimeout(timer);
          timer = setTimeout(() => vscode.commands.executeCommand("codexContext.indexWorkspace"), 1000);
        };
        watcher.onDidCreate(schedule);
        watcher.onDidChange(schedule);
        watcher.onDidDelete(schedule);
        context.subscriptions.push(watcher);
      }
    }
  });
}

function deactivate() {}

module.exports = { activate, deactivate };
