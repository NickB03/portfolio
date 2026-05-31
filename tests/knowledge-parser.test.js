const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadModule(filePath) {
  const { outputText } = ts.transpileModule(readFileSync(filePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const mod = { exports: {} };
  new Function("require", "module", "exports", outputText)(require, mod, mod.exports);
  return mod.exports;
}

const parser = loadModule(join(process.cwd(), "scripts/lib/knowledge-parser.ts"));

test("extractWikilinks pulls targets and ignores display aliases", () => {
  const links = parser.extractWikilinks(
    "See [[Polymorph]] and [[AI Engineering|the engineering work]] plus [[SD-WAN & SASE]]."
  );
  assert.deepEqual(links, ["Polymorph", "AI Engineering", "SD-WAN & SASE"]);
});

test("parseFrontmatter splits scalars, inline arrays, and body", () => {
  const { data, body } = parser.parseFrontmatter(
    [
      "---",
      "id: vana-bot",
      "title: vana.bot",
      "tags: [ai, react, full-stack]",
      'aliases: [vana, "vana bot"]',
      "---",
      "Body line one.",
      "",
      "Body line two.",
    ].join("\n")
  );

  assert.equal(data.id, "vana-bot");
  assert.equal(data.title, "vana.bot");
  assert.deepEqual(data.tags, ["ai", "react", "full-stack"]);
  assert.deepEqual(data.aliases, ["vana", "vana bot"]);
  assert.match(body, /^Body line one\./);
});

test("splitIntoChunks keeps the intro and one chunk per heading", () => {
  const chunks = parser.splitIntoChunks(
    "Intro paragraph.\n\n## Architecture\nDetails here.\n\n## Why\nBecause reasons."
  );
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].section, undefined);
  assert.equal(chunks[1].section, "Architecture");
  assert.match(chunks[1].content, /Details here\./);
  assert.equal(chunks[2].section, "Why");
});

test("parseKnowledgeFile builds a normalized entity", () => {
  const raw = [
    "---",
    "id: vana-bot",
    "type: Project",
    "title: vana.bot",
    "visibility: public",
    "tags: [AI, React]",
    "aliases: [vana]",
    "links: [AnalystAI]",
    "---",
    "A full-stack AI chat app.",
    "",
    "## How it connects",
    "Shares ideas with [[Polymorph]].",
  ].join("\n");

  const entity = parser.parseKnowledgeFile(raw, "projects/vana-bot.md");
  assert.equal(entity.id, "vana-bot");
  assert.equal(entity.type, "project");
  assert.equal(entity.visibility, "public");
  assert.deepEqual(entity.tags, ["ai", "react"]);
  assert.equal(entity.chunks.length, 2);
  assert.match(entity.summary, /full-stack AI chat app/);
  // frontmatter link + inline body wikilink, deduped
  assert.deepEqual(entity.wikilinks.sort(), ["AnalystAI", "Polymorph"]);
});

test("parseKnowledgeFile falls back to filename id and defaults visibility to public", () => {
  const entity = parser.parseKnowledgeFile("No frontmatter here.", "skills/Product-Strategy.md");
  assert.equal(entity.id, "product-strategy");
  assert.equal(entity.visibility, "public");
  assert.equal(entity.chunks.length, 1);
});

test("resolveEdges matches by id, title, and alias, dedupes, and flags dangling links", () => {
  const entities = [
    { id: "vana-bot", title: "vana.bot", aliases: ["vana"], wikilinks: ["AnalystAI", "Polymorph", "Nope"] },
    { id: "analystai", title: "AnalystAI", aliases: ["analyst ai"], wikilinks: ["vana"] },
    { id: "polymorph", title: "Polymorph", aliases: [], wikilinks: ["polymorph"] },
  ];

  const { edges, danglingLinks } = parser.resolveEdges(entities);

  // vana-bot -> analystai (title), vana-bot -> polymorph (title), analystai -> vana-bot (alias)
  assert.equal(edges.length, 3);
  assert.ok(edges.some((e) => e.src === "vana-bot" && e.dst === "analystai"));
  assert.ok(edges.some((e) => e.src === "vana-bot" && e.dst === "polymorph"));
  assert.ok(edges.some((e) => e.src === "analystai" && e.dst === "vana-bot"));
  // polymorph -> polymorph is a self-link and skipped
  assert.ok(!edges.some((e) => e.src === "polymorph"));
  // "Nope" resolves to nothing
  assert.deepEqual(danglingLinks, [{ src: "vana-bot", target: "Nope" }]);
});
