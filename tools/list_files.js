import fs from "node:fs";
import nodePath from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const config = require("../config.json");
const allowedDirs = (config.allowed_dirs ?? []).map(d => nodePath.resolve(d));

function isAllowed(filePath) {
  return allowedDirs.some(dir => filePath.startsWith(dir + nodePath.sep) || filePath === dir);
}

function listDir(dirPath, recursive, depth, maxDepth) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const lines = [];

  for (const entry of entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  })) {
    const indent = "  ".repeat(depth);
    const fullPath = nodePath.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      lines.push(`${indent}📁 ${entry.name}/`);
      if (recursive && depth < maxDepth) {
        lines.push(...listDir(fullPath, recursive, depth + 1, maxDepth));
      }
    } else {
      const stat = fs.statSync(fullPath);
      const size = formatSize(stat.size);
      lines.push(`${indent}📄 ${entry.name} (${size})`);
    }
  }

  return lines;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const definition = {
  name: "list_files",
  description: "Listet Dateien und Verzeichnisse in einem Pfad auf",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Verzeichnis das aufgelistet werden soll"
      },
      recursive: {
        type: "boolean",
        description: "Unterverzeichnisse rekursiv auflisten (Standard: false)"
      },
      max_depth: {
        type: "number",
        description: "Maximale Tiefe bei rekursiver Auflistung (Standard: 3)"
      }
    },
    required: ["path"]
  }
};

export async function execute(args) {
  const dirPath = nodePath.resolve(args?.path ?? "");
  const recursive = args?.recursive === true;
  const maxDepth = typeof args?.max_depth === "number" ? args.max_depth : 3;

  if (!isAllowed(dirPath)) {
    return {
      content: [{ type: "text", text: `Zugriff verweigert: "${dirPath}" liegt nicht in einem erlaubten Verzeichnis.\nErlaubt: ${allowedDirs.join(", ")}` }]
    };
  }

  try {
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) {
      return {
        content: [{ type: "text", text: `"${dirPath}" ist kein Verzeichnis.` }]
      };
    }

    const lines = listDir(dirPath, recursive, 0, maxDepth);

    if (lines.length === 0) {
      return {
        content: [{ type: "text", text: `📂 ${dirPath} (leer)` }]
      };
    }

    return {
      content: [{ type: "text", text: `📂 ${dirPath}\n${lines.join("\n")}` }]
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Fehler beim Auflisten von "${dirPath}": ${err.message}` }]
    };
  }
}
