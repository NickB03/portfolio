const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const repoRoot = join(__dirname, "..");

function readRepoFile(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

test("architecture docs describe the current Gemini embedding dimension and schema migrations", () => {
  const architectureDoc = readRepoFile("docs/architecture.md");
  const ragFlowSvg = readRepoFile("docs/assets/ai-chat-rag-flow.svg");

  assert.match(
    architectureDoc,
    /3072-dimensional vector embedding/,
    "docs/architecture.md should describe the current gemini-embedding-001 vector size"
  );
  assert.doesNotMatch(
    architectureDoc,
    /768-dimensional vector embedding/,
    "docs/architecture.md should not describe the obsolete initial vector size as current"
  );
  assert.match(
    architectureDoc,
    /supabase\/migrations\/002_vector_store\.sql/,
    "docs/architecture.md should keep the initial vector table migration in the source map"
  );
  assert.match(
    architectureDoc,
    /supabase\/migrations\/003_update_vector_dimension\.sql/,
    "docs/architecture.md should include the migration that updates embeddings to vector(3072)"
  );
  assert.match(
    architectureDoc,
    /supabase\/migrations\/004_fix_security_warnings\.sql/,
    "docs/architecture.md should include the current search_knowledge signature migration"
  );
  assert.match(
    ragFlowSvg,
    />3072-d vectors</,
    "AI chat RAG diagram should render the current embedding vector size"
  );
  assert.doesNotMatch(
    ragFlowSvg,
    />768-d vectors</,
    "AI chat RAG diagram should not render the obsolete vector size"
  );
});
