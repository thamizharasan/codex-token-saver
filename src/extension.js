import path from "node:path";
import * as vscode from "vscode";
import { runDoctor, runNew, runSync, runUpgrade } from "./core.js";

function workspaceRoot() {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function requireWorkspace() {
  const root = workspaceRoot();
  if (!root) throw new Error("Open a workspace folder first.");
  return root;
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
      const result = runDoctor(requireWorkspace());
      output.clear();
      output.appendLine("Codex Context Doctor");
      output.appendLine("");
      for (const item of result.results) output.appendLine(item.line);
      output.show();
    }),
    vscode.commands.registerCommand("codexContext.upgradeAgents", () => {
      const result = runUpgrade(requireWorkspace());
      vscode.window.showInformationMessage(`Codex Context: ${result.action} .codex/AGENTS.md`);
    })
  );
}

export function deactivate() {}
