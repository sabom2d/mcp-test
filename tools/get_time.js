export const definition = {
  name: "get_time",
  description: "Gibt die aktuelle Uhrzeit und das Datum zurück",
  inputSchema: {
    type: "object",
    properties: {
      timezone: {
        type: "string",
        description: "Zeitzone z.B. 'Europe/Berlin' (optional, Standard: UTC)"
      }
    },
    required: []
  }
};

export async function execute(args) {
  const tz = args?.timezone ?? "UTC";
  try {
    const now = new Date();
    const formatted = now.toLocaleString("de-DE", {
      timeZone: tz,
      dateStyle: "full",
      timeStyle: "long"
    });
    return {
      content: [{ type: "text", text: `🕐 ${formatted} (${tz})` }]
    };
  } catch {
    return {
      content: [{ type: "text", text: `Ungültige Zeitzone: ${tz}` }]
    };
  }
}
