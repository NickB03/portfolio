const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const vanaBotKnowledge = () =>
  readFileSync(join(process.cwd(), "content/knowledge/projects/vana-bot.md"), "utf8");

test("vana.bot knowledge uses shipped app framing without end-to-end language", () => {
  const source = vanaBotKnowledge();

  assert.match(
    source,
    /It is a shipped full-stack AI project that reflects how I turn AI capabilities into usable product experiences\./
  );
  assert.doesNotMatch(source, /first end-to-end/i);
  assert.doesNotMatch(source, /all the way to a shipped, production application/i);
});
