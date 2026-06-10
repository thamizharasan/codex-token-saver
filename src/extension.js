import path from "node:path";
import * as vscode from "vscode";
import {
  countEligibleFiles,
  isIgnoredWorkspacePath,
  runContextDoctor,
  runContextIndex,
  runGlobalDoctor,
  runGlobalSetup,
  runNew,
  runProjectDoctor,
  runProjectUpgrade,
  runSync
} from "./core.js";

function workspaceRoot() {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function requireWorkspace() {
  const root = workspaceRoot();
  if (!root) throw new Error("Open a workspace folder first.");
  return root;
}

function maxFileSizeKb() {
  return vscode.workspace.getConfiguration("codexContext").get("maxFileSizeKb", 300);
}

function writeIndexReport(output, result) {
  output.clear();
  output.appendLine("indexing started");
  output.appendLine(`${result.filesIndexed} files indexed`);
  output.appendLine(`${result.written} artifacts written`);
  output.appendLine(`${result.skippedLarge} skipped large files count`);
  output.appendLine(`${result.ignored} ignored files count`);
  output.show();
}

export function activate(context) {
  const output = vscode.window.createOutputChannel("Codex Context");

  context.subscriptions.push(
    output,
    vscode.commands.registerCommand("codexContext.newProject", async () => {
      const name = await vscode.window.showInputBox({ prompt: "Project name" });
      if (!name) return;
      const parent = workspaceRoot() ?? process.cwd();
      const result = runNew(path.join(parent, name));
      vscode.window.showInformationMessage(`Codex Context: created ${result.root}`);
    }),
    vscode.commands.registerCommand("codexContext.syncWorkspace", () => {
      const result = runSync(requireWorkspace());
      vscode.window.showInformationMessage(`Codex Context: created ${result.created} missing file(s)`);
    }),
    vscode.commands.registerCommand("codexContext.doctorWorkspace", () => {
      const result = runProjectDoctor(requireWorkspace());
      output.clear();
      output.appendLine("Codex Context Doctor");
      output.appendLine("");
      for (const item of result.results) output.appendLine(item.line);
      output.show();
    }),
    vscode.commands.registerCommand("codexContext.upgradeAgents", () => {
      const result = runProjectUpgrade(requireWorkspace());
      vscode.window.showInformationMessage(`Codex Context: ${result.action} .codex/AGENTS.md`);
    }),
    vscode.commands.registerCommand("codexContext.setupGlobal", () => {
      const result = runGlobalSetup();
      vscode.window.showInformationMessage(`Codex Context: ${result.action} global AGENTS.md`);
    }),
    vscode.commands.registerCommand("codexContext.doctorGlobal", () => {
      const result = runGlobalDoctor();
      output.clear();
      output.appendLine("Codex Context Global Doctor");
      output.appendLine("");
      for (const item of result.results) output.appendLine(item.line);
      output.show();
    }),
    vscode.commands.registerCommand("codexContext.indexWorkspace", () => {
      output.clear();
      output.appendLine("indexing started");
      output.show();
      const result = runContextIndex(requireWorkspace(), { maxFileSizeKb: maxFileSizeKb() });
      writeIndexReport(output, result);
      vscode.window.showInformationMessage("Codex Context: artifacts written");
    }),
    vscode.commands.registerCommand("codexContext.contextDoctor", () => {
      const result = runContextDoctor(requireWorkspace());
      output.clear();
      output.appendLine("Codex Context Artifact Doctor");
      output.appendLine("");
      for (const item of result.results) output.appendLine(item.line);
      output.show();
    })
  );

  if (vscode.workspace.getConfiguration("codexContext").get("autoIndex", false)) {
    const root = workspaceRoot();
    if (root) {
      const count = countEligibleFiles(root, { maxFileSizeKb: maxFileSizeKb() });
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
        if (isIgnoredWorkspacePath(root, uri.fsPath)) return;
        clearTimeout(timer);
        timer = setTimeout(() => vscode.commands.executeCommand("codexContext.indexWorkspace"), 1000);
      };
      watcher.onDidCreate(schedule);
      watcher.onDidChange(schedule);
      watcher.onDidDelete(schedule);
      context.subscriptions.push(watcher);
    }
  }
}

export function deactivate() {}
