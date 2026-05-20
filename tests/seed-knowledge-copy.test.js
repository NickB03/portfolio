const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const seedKnowledgeSource = () =>
  readFileSync(join(process.cwd(), "scripts/seed-knowledge.ts"), "utf8");

test("vana.bot seed knowledge uses shipped app framing without end-to-end language", () => {
  const source = seedKnowledgeSource();

  assert.match(
    source,
    /It is a shipped full-stack AI project that reflects how I turn AI capabilities into usable product experiences\./
  );
  assert.doesNotMatch(source, /first end-to-end/i);
  assert.doesNotMatch(source, /all the way to a shipped, production application/i);
});
