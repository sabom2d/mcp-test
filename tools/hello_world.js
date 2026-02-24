export const definition = {
  name: "hello_world",
  description: "Gibt eine Grußnachricht zurück",
  inputSchema: {
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"]
  }
};

export async function execute(args) {
  const name = args?.name ?? "Unbekannt";
  return {
    content: [{ type: "text", text: `Hallo ${name}, MCP-HTTP funktioniert jetzt! 🎉` }]
  };
}
