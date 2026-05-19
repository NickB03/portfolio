const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const routePath = join(process.cwd(), "src/app/api/chat/route.ts");

function loadPostHandler() {
  const { outputText } = ts.transpileModule(readFileSync(routePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });

  const routeModule = { exports: {} };
  const compile = new Function("require", "module", "exports", outputText);
  compile(require, routeModule, routeModule.exports);

  return routeModule.exports.POST;
}

async function postChat(body) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
  );
}

const POST = loadPostHandler();

test("chat POST route is gated by the server-only ENABLE_AI_CHAT flag", async () => {
  const originalEnv = {
    ENABLE_AI_CHAT: process.env.ENABLE_AI_CHAT,
    NEXT_PUBLIC_ENABLE_AI_CHAT: process.env.NEXT_PUBLIC_ENABLE_AI_CHAT,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  try {
    process.env.ENABLE_AI_CHAT = "false";
    process.env.NEXT_PUBLIC_ENABLE_AI_CHAT = "true";

    const disabledResponse = await postChat("{ this is not valid json");
    assert.equal(disabledResponse.status, 404);
    assert.deepEqual(await disabledResponse.json(), {
      error: "Not Found",
      message: "The AI assistant is currently disabled.",
    });

    process.env.ENABLE_AI_CHAT = "true";

    const invalidMessageResponse = await postChat(JSON.stringify({ message: "" }));
    assert.equal(invalidMessageResponse.status, 400);
    assert.equal((await invalidMessageResponse.json()).error, "Message is required");

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    let missingConfigResponse;
    const originalConsoleError = console.error;
    try {
      console.error = () => {};
      missingConfigResponse = await postChat(JSON.stringify({ message: "Hello" }));
    } finally {
      console.error = originalConsoleError;
    }

    assert.equal(missingConfigResponse.status, 500);
    assert.equal((await missingConfigResponse.json()).error, "Server configuration error");
  } finally {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
