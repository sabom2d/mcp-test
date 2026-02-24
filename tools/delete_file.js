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
  name: "delete_file",
  description: "Löscht eine Datei oder ein leeres Verzeichnis",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Pfad zur Datei oder zum Verzeichnis das gelöscht werden soll"
      },
      recursive: {
        type: "boolean",
        description: "Verzeichnis rekursiv löschen, auch wenn es nicht leer ist (Standard: false)"
      }
    },
    required: ["path"]
  }
};

export async function execute(args) {
  const targetPath = nodePath.resolve(args?.path ?? "");
  const recursive = args?.recursive === true;

  if (!isAllowed(targetPath)) {
    return {
      content: [{ type: "text", text: `Zugriff verweigert: "${targetPath}" liegt nicht in einem erlaubten Verzeichnis.\nErlaubt: ${allowedDirs.join(", ")}` }]
    };
  }

  // Wurzel eines erlaubten Verzeichnisses selbst darf nicht gelöscht werden
  if (allowedDirs.includes(targetPath)) {
    return {
      content: [{ type: "text", text: `Verweigert: Das Wurzelverzeichnis "${targetPath}" darf nicht gelöscht werden.` }]
    };
  }

  try {
    const stat = fs.statSync(targetPath);

    if (stat.isDirectory()) {
      if (recursive) {
        fs.rmSync(targetPath, { recursive: true, force: true });
        return {
          content: [{ type: "text", text: `🗑️ Verzeichnis rekursiv gelöscht: ${targetPath}` }]
        };
      } else {
        fs.rmdirSync(targetPath);
        return {
          content: [{ type: "text", text: `🗑️ Verzeichnis gelöscht: ${targetPath}` }]
        };
      }
    } else {
      fs.unlinkSync(targetPath);
      return {
        content: [{ type: "text", text: `🗑️ Datei gelöscht: ${targetPath}` }]
      };
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      return {
        content: [{ type: "text", text: `Datei oder Verzeichnis nicht gefunden: "${targetPath}"` }]
      };
    }
    if (err.code === "ENOTEMPTY") {
      return {
        content: [{ type: "text", text: `Verzeichnis ist nicht leer: "${targetPath}"\nHinweis: recursive: true verwenden um es trotzdem zu löschen.` }]
      };
    }
    return {
      content: [{ type: "text", text: `Fehler beim Löschen von "${targetPath}": ${err.message}` }]
    };
  }
}
