import nodePath from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const config = require("../config.json");
const allowedDirs = (config.allowed_dirs ?? []).map(d => nodePath.resolve(d));

function isAllowed(filePath) {
  return allowedDirs.some(dir => filePath.startsWith(dir + nodePath.sep) || filePath === dir);
}

function formatDiff(rawDiff, fileA, fileB) {
  if (!rawDiff.trim()) {
    return `✅ Keine Unterschiede zwischen:\n  ${fileA}\n  ${fileB}`;
  }

  const lines = rawDiff.split("\n");
  const output = [];
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      output.push(`\n── ${line} ──`);
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      output.push(`+ ${line.slice(1)}`);
      additions++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      output.push(`- ${line.slice(1)}`);
      deletions++;
    } else if (line.startsWith(" ")) {
      output.push(`  ${line.slice(1)}`);
    }
  }

  return [
    `Vergleich: ${nodePath.basename(fileA)} ↔ ${nodePath.basename(fileB)}`,
    `+${additions} Zeilen hinzugefügt  -${deletions} Zeilen entfernt`,
    "",
    ...output
  ].join("\n");
}

export const definition = {
  name: "diff_files",
  description: "Vergleicht zwei Textdateien und gibt nur die Unterschiede zurück",
  inputSchema: {
    type: "object",
    properties: {
      file_a: {
        type: "string",
        description: "Pfad zur ersten Datei (Basis)"
      },
      file_b: {
        type: "string",
        description: "Pfad zur zweiten Datei (Vergleich)"
      },
      context: {
        type: "number",
        description: "Anzahl Kontextzeilen um Änderungen (Standard: 3)"
      }
    },
    required: ["file_a", "file_b"]
  }
};

export async function execute(args) {
  const fileA = nodePath.resolve(args?.file_a ?? "");
  const fileB = nodePath.resolve(args?.file_b ?? "");
  const context = Number.isInteger(args?.context) ? args.context : 3;

  for (const [label, filePath] of [["file_a", fileA], ["file_b", fileB]]) {
    if (!isAllowed(filePath)) {
      return {
        content: [{ type: "text", text: `Zugriff verweigert für ${label}: "${filePath}"\nErlaubt: ${allowedDirs.join(", ")}` }]
      };
    }
  }

  try {
    const rawDiff = execSync(
      `diff -U${context} --label "${nodePath.basename(fileA)}" --label "${nodePath.basename(fileB)}" "${fileA}" "${fileB}" || true`,
      { encoding: "utf-8" }
    );

    return {
      content: [{ type: "text", text: formatDiff(rawDiff, fileA, fileB) }]
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Fehler beim Vergleich: ${err.message}` }]
    };
  }
}
