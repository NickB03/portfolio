const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const projectCardSource = () =>
  readFileSync(join(process.cwd(), "src/components/project-card.tsx"), "utf8");

const seedKnowledgeSource = () =>
  readFileSync(join(process.cwd(), "scripts/seed-knowledge.ts"), "utf8");

test("project card exposes one full-card primary link while preserving badge links", () => {
  const source = projectCardSource();

  assert.match(source, /className="absolute inset-0 z-10/);
  assert.match(source, /aria-label=\{`Open \$\{title\}`\}/);
  assert.match(source, /className="absolute top-2 right-2 z-30/);
  assert.equal(source.match(/href=\{href\}/g)?.length, 1);
  assert.match(source, /View project/);
});

test("vana.bot seed knowledge uses shipped app framing without end-to-end language", () => {
  const source = seedKnowledgeSource();

  assert.match(
    source,
    /It is a shipped full-stack AI project that reflects how I turn AI capabilities into usable product experiences\./
  );
  assert.doesNotMatch(source, /first end-to-end/i);
  assert.doesNotMatch(source, /all the way to a shipped, production application/i);
});
