const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const projectsSectionSource = () =>
  readFileSync(join(process.cwd(), "src/components/section/projects-section.tsx"), "utf8");

test("projects carousel renders each project once and lets Embla handle looping", () => {
  const source = projectsSectionSource();

  assert.doesNotMatch(source, /const\s+slides\s*=\s*\[\s*\.\.\.projects\s*,\s*\.\.\.projects\s*\]/);
  assert.match(source, /\{projects\.map\(\(project, i\) =>/);
});

test("projects carousel leaves vertical room for lifted project-card hover states", () => {
  const source = projectsSectionSource();

  assert.match(source, /className="overflow-hidden py-3 -my-3"/);
});
