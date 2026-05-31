-- Knowledge graph + hybrid retrieval
--
-- Adds:
--   * entity_id / visibility / full-text (fts) columns on knowledge_chunks
--   * kg_entities + kg_edges (a lightweight graph derived from [[wikilinks]])
--   * keyword (full-text) search + 1-hop graph traversal RPCs
--   * an include_private flag on retrieval so private content is gated in SQL
--     (the chat route uses the service-role key, so RLS is bypassed — visibility
--      MUST be enforced via these WHERE clauses, not RLS).
--
-- Follows migration 004: the `vector` type lives in the `extensions` schema and
-- every function pins search_path = 'public','extensions'.
--
-- NOTE on dimensions: embeddings remain vector(3072). pgvector cannot build an
-- HNSW/IVFFlat index above 2000 dims, so retrieval is still a sequential scan —
-- fine at this corpus size. A future optimization is to re-embed at 1536 dims
-- (gemini-embedding-001 supports outputDimensionality via Matryoshka) and add
--   CREATE INDEX ... USING hnsw (embedding vector_cosine_ops);
-- That requires a coordinated column retype + full re-seed, so it is deferred.

SET search_path TO public, extensions;

-- 1. Extend knowledge_chunks: graph join key, visibility gate, generated FTS column
ALTER TABLE public.knowledge_chunks
  ADD COLUMN IF NOT EXISTS entity_id  text,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'private')),
  ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

CREATE INDEX IF NOT EXISTS knowledge_chunks_fts_idx        ON public.knowledge_chunks USING gin (fts);
CREATE INDEX IF NOT EXISTS knowledge_chunks_entity_idx     ON public.knowledge_chunks (entity_id);
CREATE INDEX IF NOT EXISTS knowledge_chunks_visibility_idx ON public.knowledge_chunks (visibility);

-- 2. Entities (one row per knowledge file)
CREATE TABLE IF NOT EXISTS public.kg_entities (
  id         text PRIMARY KEY,
  type       text NOT NULL,
  title      text NOT NULL,
  aliases    text[] DEFAULT '{}',
  tags       text[] DEFAULT '{}',
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  summary    text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kg_entities_type_idx       ON public.kg_entities (type);
CREATE INDEX IF NOT EXISTS kg_entities_visibility_idx ON public.kg_entities (visibility);

-- 3. Edges (directed wikilink source -> target; queried undirected)
CREATE TABLE IF NOT EXISTS public.kg_edges (
  src_id   text NOT NULL REFERENCES public.kg_entities(id) ON DELETE CASCADE,
  dst_id   text NOT NULL REFERENCES public.kg_entities(id) ON DELETE CASCADE,
  relation text NOT NULL DEFAULT 'references',
  PRIMARY KEY (src_id, dst_id, relation)
);
CREATE INDEX IF NOT EXISTS kg_edges_src_idx ON public.kg_edges (src_id);
CREATE INDEX IF NOT EXISTS kg_edges_dst_idx ON public.kg_edges (dst_id);

ALTER TABLE public.kg_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_edges    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for kg_entities" ON public.kg_entities;
DROP POLICY IF EXISTS "Public read access for kg_edges"    ON public.kg_edges;
CREATE POLICY "Public read access for kg_entities" ON public.kg_entities FOR SELECT USING (true);
CREATE POLICY "Public read access for kg_edges"    ON public.kg_edges    FOR SELECT USING (true);

-- 4. Vector search — replace the 3-arg version with one that returns entity_id
--    and gates private content.
DROP FUNCTION IF EXISTS public.search_knowledge(vector(3072), float, int);

CREATE OR REPLACE FUNCTION public.search_knowledge(
  query_embedding vector(3072),
  match_threshold float default 0.5,
  match_count int default 8,
  include_private boolean default false
)
RETURNS TABLE (
  id uuid,
  entity_id text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SET search_path = 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.entity_id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks kc
  WHERE (include_private OR kc.visibility = 'public')
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Keyword (full-text) search
CREATE OR REPLACE FUNCTION public.keyword_search_knowledge(
  query_text text,
  match_count int default 8,
  include_private boolean default false
)
RETURNS TABLE (
  id uuid,
  entity_id text,
  content text,
  metadata jsonb,
  rank float
)
LANGUAGE plpgsql
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  ts_query tsquery;
BEGIN
  ts_query := websearch_to_tsquery('english', query_text);
  IF ts_query IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    kc.id,
    kc.entity_id,
    kc.content,
    kc.metadata,
    ts_rank(kc.fts, ts_query)::float AS rank
  FROM public.knowledge_chunks kc
  WHERE (include_private OR kc.visibility = 'public')
    AND kc.fts @@ ts_query
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- 6. Graph traversal — 1-hop undirected neighbors of a set of entity ids
CREATE OR REPLACE FUNCTION public.traverse_graph(
  entity_ids text[],
  max_neighbors int default 5,
  include_private boolean default false
)
RETURNS TABLE (
  id text,
  type text,
  title text,
  summary text,
  relation text
)
LANGUAGE plpgsql
SET search_path = 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT e.id, e.type, e.title, e.summary, ed.relation
  FROM public.kg_edges ed
  JOIN public.kg_entities e
    ON e.id = CASE WHEN ed.src_id = ANY(entity_ids) THEN ed.dst_id ELSE ed.src_id END
  WHERE (ed.src_id = ANY(entity_ids) OR ed.dst_id = ANY(entity_ids))
    AND NOT (e.id = ANY(entity_ids))
    AND (include_private OR e.visibility = 'public')
  LIMIT max_neighbors;
END;
$$;

-- 7. Grants
GRANT EXECUTE ON FUNCTION public.search_knowledge(vector(3072), float, int, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.keyword_search_knowledge(text, int, boolean)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.traverse_graph(text[], int, boolean)                TO anon, authenticated;
