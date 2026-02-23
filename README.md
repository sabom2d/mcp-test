# mcp-test

A minimal MCP (Model Context Protocol) server using the Streamable HTTP transport.

## Features

- Exposes a `hello_world` tool via the MCP protocol
- Uses stateless Streamable HTTP transport (one transport instance per request)
- Responds with JSON on port 8080

## Requirements

- Node.js 18+
- npm

## Installation

```bash
npm install
```

## Usage

```bash
node server.js
```

The server listens on `http://127.0.0.1:8080/mcp`.

## Example

```bash
curl -X POST http://127.0.0.1:8080/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```
