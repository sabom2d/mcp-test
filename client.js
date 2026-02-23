#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function main() {
  // 1) HTTP-Transport korrekt initialisieren
  const transport = new StreamableHTTPClientTransport({
    url: "http://localhost:8080/mcp"
  });

  // 2) Client mit Name/Version
  const client = new Client({
    name: "mcp-test-client",
    version: "1.0.0"
  });

  try {
    // 3) Verbindung zum HTTP-Transport aufbauen
    await client.connect(transport);

    // 4) Tools abrufen
    const tools = await client.request({ method: "tools/list" });
    console.log("Tools:", JSON.stringify(tools, null, 2));

    // 5) Tool ausführen
    const result = await client.request({
      method: "tools/call",
      params: {
        name: "hello_world",
        arguments: { name: "Rene" }
      }
    });
    console.log("Result:", JSON.stringify(result, null, 2));

  } catch (err) {
    console.error("Client error:", err);
  } finally {
    await client.close().catch(() => {});
  }
}

await main();
