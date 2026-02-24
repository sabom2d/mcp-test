#!/usr/bin/env node

import http from "node:http";
import fs from "node:fs";
import nodePath from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

const __dirname = nodePath.dirname(fileURLToPath(import.meta.url));

// -------------------------------------------------------------
// 1) Tools dynamisch aus tools/ laden
// -------------------------------------------------------------
const toolsDir = nodePath.join(__dirname, "tools");
const toolModules = {};

for (const file of fs.readdirSync(toolsDir).filter(f => f.endsWith(".js"))) {
  const mod = await import(pathToFileURL(nodePath.join(toolsDir, file)).href);
  toolModules[mod.definition.name] = mod;
  console.log(`Tool geladen: ${mod.definition.name}`);
}

// -------------------------------------------------------------
// 2) Server-Factory – new instance per request (stateless mode)
// -------------------------------------------------------------
function createServer() {
  const server = new Server(
    { name: "mcp-test-server", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Object.values(toolModules).map(t => t.definition)
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = toolModules[request.params.name];
    if (!tool) {
      throw new Error(`Unbekanntes Tool: ${request.params.name}`);
    }
    return tool.execute(request.params.arguments);
  });

  return server;
}

// -------------------------------------------------------------
// 3) HTTP-Server – fresh server + transport per request
// -------------------------------------------------------------
const httpServer = http.createServer(async (req, res) => {
  const urlPath = req.url.split("?")[0];
  console.log("\n=== NEW HTTP REQUEST ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Path:", urlPath);

  if (req.method === "GET" && urlPath === "/") {
    fs.readFile(nodePath.join(__dirname, "public", "index.html"), (err, data) => {
      if (err) {
        res.statusCode = 500;
        res.end("Could not load index.html");
        return;
      }
      res.setHeader("Content-Type", "text/html");
      res.end(data);
    });
    return;
  }

  if (urlPath === "/mcp" || urlPath === "/mcp/") {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    await server.connect(transport);
    try {
      console.log("-> Routing to transport.handleRequest()");
      await transport.handleRequest(req, res);
      console.log("-> handleRequest() finished OK");
      res.on("close", () => { transport.close(); server.close(); });
    } catch (err) {
      console.error("\n🔥 ERROR INSIDE transport.handleRequest():", err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("Transport error");
      }
    }
  } else {
    console.log("-> 404 Not Found:", urlPath);
    res.statusCode = 404;
    res.end("Not found");
  }
});

// -------------------------------------------------------------
// 4) Server starten
// -------------------------------------------------------------
const PORT = 8080;
httpServer.listen(PORT, () => {
  console.log(`MCP HTTP-Server läuft korrekt auf http://127.0.0.1:${PORT}/mcp`);
  console.log(`${Object.keys(toolModules).length} Tool(s) registriert: ${Object.keys(toolModules).join(", ")}`);
});
