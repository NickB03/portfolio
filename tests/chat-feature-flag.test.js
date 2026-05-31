const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const routePath = join(process.cwd(), "src/app/api/chat/route.ts");
const providerPath = join(process.cwd(), "src/components/ui/ai-chat/ai-chat-provider.tsx");
const chatScrollPath = join(process.cwd(), "src/components/ui/ai-chat/chat-scroll.ts");

function resolveAliasPath(id) {
  const base = join(process.cwd(), "src", id.slice(2));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
    join(base, "index.js"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) || base;
}

// Mirrors the `@/*` -> `./src/*` path alias so transpiled modules can require
// sibling source files instead of only node_modules packages.
function createAliasRequire(baseRequire, compilerOptions, cache) {
  return function aliasRequire(id) {
    if (!id.startsWith("@/")) return baseRequire(id);

    const filePath = resolveAliasPath(id);
    if (cache.has(filePath)) return cache.get(filePath).exports;

    const { outputText } = ts.transpileModule(readFileSync(filePath, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        ...compilerOptions,
      },
    });
    const mod = { exports: {} };
    cache.set(filePath, mod);
    new Function("require", "module", "exports", outputText)(aliasRequire, mod, mod.exports);
    return mod.exports;
  };
}

function loadCommonJsModule(filePath, compilerOptions = {}) {
  const { outputText } = ts.transpileModule(readFileSync(filePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      ...compilerOptions,
    },
  });

  const routeModule = { exports: {} };
  const aliasRequire = createAliasRequire(require, compilerOptions, new Map());
  const compile = new Function("require", "module", "exports", outputText);
  compile(aliasRequire, routeModule, routeModule.exports);

  return routeModule.exports;
}

function loadPostHandler() {
  return loadCommonJsModule(routePath).POST;
}

async function postChat(body, options = {}) {
  const postHandler = options.postHandler || POST;

  return postHandler(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...options.headers },
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

    const malformedJsonResponse = await postChat("{ this is not valid json");
    assert.equal(malformedJsonResponse.status, 400);
    assert.equal((await malformedJsonResponse.json()).error, "Malformed JSON");

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

test("chat retry resolves the failed turn that was clicked", () => {
  const { getRetryTurn } = loadCommonJsModule(providerPath, {
    jsx: ts.JsxEmit.ReactJSX,
  });

  assert.equal(typeof getRetryTurn, "function");

  const messages = [
    { id: "user-old", role: "user", content: "old question" },
    { id: "assistant-old", role: "assistant", content: "old error", isError: true },
    { id: "user-latest", role: "user", content: "latest question" },
    { id: "assistant-latest", role: "assistant", content: "latest error", isError: true },
  ];

  assert.deepEqual(getRetryTurn(messages, "assistant-old"), {
    content: "old question",
    historyMessages: [],
  });
  assert.deepEqual(getRetryTurn(messages, "assistant-latest"), {
    content: "latest question",
    historyMessages: messages.slice(0, 2),
  });
  assert.equal(getRetryTurn(messages, "missing-assistant"), null);
});

test("chat stream timeout preserves assistant text that already rendered", () => {
  const { getAssistantFailureState } = loadCommonJsModule(providerPath, {
    jsx: ts.JsxEmit.ReactJSX,
  });

  assert.equal(typeof getAssistantFailureState, "function");

  assert.deepEqual(
    getAssistantFailureState(
      new DOMException("The operation was aborted.", "AbortError"),
      "Nick works on AI product experiences."
    ),
    {
      content: "Nick works on AI product experiences.",
      isError: false,
    }
  );

  assert.deepEqual(
    getAssistantFailureState(
      new DOMException("The operation was aborted.", "AbortError"),
      ""
    ),
    {
      content: "Request timed out. Please check your connection and try again.",
      isError: true,
    }
  );
});

test("chat auto-scroll targets the visible desktop viewport instead of hidden mobile pane", () => {
  const { getActiveChatScrollElement } = loadCommonJsModule(chatScrollPath);

  assert.equal(typeof getActiveChatScrollElement, "function");

  const visibleMobilePane = {
    getClientRects: () => [{ width: 360, height: 480 }],
    offsetHeight: 480,
    offsetWidth: 360,
  };
  const hiddenMobilePane = {
    getClientRects: () => [],
    offsetHeight: 0,
    offsetWidth: 0,
  };
  const desktopViewport = {
    getClientRects: () => [{ width: 420, height: 480 }],
    offsetHeight: 480,
    offsetWidth: 420,
  };
  const desktopRoot = {
    getClientRects: () => [{ width: 420, height: 480 }],
    offsetHeight: 480,
    offsetWidth: 420,
    querySelector: (selector) =>
      selector === "[data-radix-scroll-area-viewport]" ? desktopViewport : null,
  };

  assert.equal(
    getActiveChatScrollElement(visibleMobilePane, desktopRoot),
    visibleMobilePane
  );
  assert.equal(
    getActiveChatScrollElement(hiddenMobilePane, desktopRoot),
    desktopViewport
  );
});

test("chat rate limiting only uses trusted Cloudflare client identity", async () => {
  const postHandler = loadPostHandler();
  const originalEnv = {
    ENABLE_AI_CHAT: process.env.ENABLE_AI_CHAT,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const validBody = JSON.stringify({ message: "Hello" });
  const statusesFor = async (headers) => {
    const statuses = [];
    const originalConsoleError = console.error;

    try {
      console.error = () => {};
      for (let i = 0; i < 11; i++) {
        const response = await postChat(validBody, { postHandler, headers });
        statuses.push(response.status);
      }
    } finally {
      console.error = originalConsoleError;
    }

    return statuses;
  };

  try {
    process.env.ENABLE_AI_CHAT = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    assert.deepEqual(await statusesFor({}), Array(11).fill(500));
    assert.deepEqual(
      await statusesFor({ "x-forwarded-for": "203.0.113.10" }),
      Array(11).fill(500)
    );

    const cloudflareStatuses = await statusesFor({ "cf-connecting-ip": "203.0.113.20" });
    assert.deepEqual(cloudflareStatuses.slice(0, 10), Array(10).fill(500));
    assert.equal(cloudflareStatuses[10], 429);
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
