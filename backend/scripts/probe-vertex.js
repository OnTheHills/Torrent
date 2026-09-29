require("dotenv").config();
require("module-alias/register");

const { generateText, isConfigured } = require("@/services/ai/vertexClient");

async function main() {
  console.log("configured:", isConfigured());
  const result = await generateText({
    prompt: "Reply with the single word pong.",
  });
  console.log({
    ok: result.ok,
    code: result.code || null,
    text: result.ok ? result.text : undefined,
    message: result.ok ? undefined : result.message,
  });
}

main();