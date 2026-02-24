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
  name: "write_file",
  description: "Schreibt Inhalt in eine Datei (erstellt oder überschreibt sie)",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Absoluter oder relativer Pfad zur Zieldatei"
      },
      content: {
        type: "string",
        description: "Inhalt der in die Datei geschrieben wird"
      },
      append: {
        type: "boolean",
        description: "true = an bestehende Datei anhängen, false = überschreiben (Standard: false)"
      }
    },
    required: ["path", "content"]
  }
};

export async function execute(args) {
  const filePath = nodePath.resolve(args?.path ?? "");
  const content = args?.content ?? "";
  const append = args?.append === true;

  if (!isAllowed(filePath)) {
    return {
      content: [{ type: "text", text: `Zugriff verweigert: "${filePath}" liegt nicht in einem erlaubten Verzeichnis.\nErlaubt: ${allowedDirs.join(", ")}` }]
    };
  }

  try {
    const dir = nodePath.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });

    if (append) {
      fs.appendFileSync(filePath, content, "utf-8");
      return {
        content: [{ type: "text", text: `✅ Inhalt angehängt an: ${filePath}` }]
      };
    } else {
      const exists = fs.existsSync(filePath);
      fs.writeFileSync(filePath, content, "utf-8");
      return {
        content: [{ type: "text", text: `✅ Datei ${exists ? "überschrieben" : "erstellt"}: ${filePath}` }]
      };
    }
  } catch (err) {
    return {
      content: [{ type: "text", text: `Fehler beim Schreiben von "${filePath}": ${err.message}` }]
    };
  }
}
