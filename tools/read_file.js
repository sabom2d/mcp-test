import fs from "node:fs";
import nodePath from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const config = require("../config.json");
const allowedDirs = (config.allowed_dirs ?? []).map(d => nodePath.resolve(d));

function isAllowed(filePath) {
  return allowedDirs.some(dir => filePath.startsWith(dir + nodePath.sep) || filePath === dir);
}

export const definition = {
  name: "read_file",
  description: "Liest den Inhalt einer Datei und gibt ihn zurück",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Absoluter oder relativer Pfad zur Datei"
      }
    },
    required: ["path"]
  }
};

export async function execute(args) {
  const filePath = nodePath.resolve(args?.path ?? "");

  if (!isAllowed(filePath)) {
    return {
      content: [{ type: "text", text: `Zugriff verweigert: "${filePath}" liegt nicht in einem erlaubten Verzeichnis.\nErlaubt: ${allowedDirs.join(", ")}` }]
    };
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return {
      content: [{ type: "text", text: content }]
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Fehler beim Lesen von "${filePath}": ${err.message}` }]
    };
  }
}
