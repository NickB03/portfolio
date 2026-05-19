const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const routePath = join(process.cwd(), "src/app/api/chat/route.ts");
const routeSource = readFileSync(routePath, "utf8");

test("chat POST route is gated by the server-only ENABLE_AI_CHAT flag", () => {
  assert.match(
    routeSource,
    /process\.env\.ENABLE_AI_CHAT/,
    "src/app/api/chat/route.ts should read the server-only ENABLE_AI_CHAT runtime flag"
  );

  assert.doesNotMatch(
    routeSource,
    /process\.env\.NEXT_PUBLIC_ENABLE_AI_CHAT/,
    "src/app/api/chat/route.ts should not gate the API endpoint on NEXT_PUBLIC_ENABLE_AI_CHAT"
  );
});
