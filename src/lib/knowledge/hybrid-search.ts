import { createClient } from "@supabase/supabase-js";

/**
 * Hybrid retrieval over the knowledge base: fuses dense vector similarity,
 * full-text keyword search, and 1-hop knowledge-graph expansion.
 *
 * Visibility is gated in SQL via `include_private` (the chat route uses the
 * service-role key, which bypasses RLS), so private chunks never surface unless
 * the caller is explicitly authorized.
 */

export interface RetrievedChunk {
    id: string;
    entityId: string | null;
    content: string;
    metadata: Record<string, unknown>;
    /** Fusion score (higher is better). */
    score: number;
}

interface VectorRow {
    id: string;
    entity_id: string | null;
    content: string;
    metadata: Record<string, unknown> | null;
    similarity: number;
}

interface KeywordRow {
    id: string;
    entity_id: string | null;
    content: string;
    metadata: Record<string, unknown> | null;
    rank: number;
}

interface NeighborRow {
    id: string;
    type: string;
    title: string;
    summary: string | null;
    relation: string;
}

/**
 * Reciprocal Rank Fusion. Combines several ranked lists without needing to
 * normalize their (incomparable) raw scores: each item scores Σ 1/(k + rank).
 */
export function reciprocalRankFusion(
    rankings: RetrievedChunk[][],
    k = 60,
    limit = 6
): RetrievedChunk[] {
    const scores = new Map<string, number>();
    const items = new Map<string, RetrievedChunk>();

    for (const ranking of rankings) {
        ranking.forEach((chunk, index) => {
            const contribution = 1 / (k + index + 1);
            scores.set(chunk.id, (scores.get(chunk.id) ?? 0) + contribution);
            if (!items.has(chunk.id)) items.set(chunk.id, chunk);
        });
    }

    return Array.from(items.values())
        .map((chunk) => ({ ...chunk, score: scores.get(chunk.id) ?? 0 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

export interface HybridSearchOptions {
    supabaseUrl: string;
    supabaseKey: string;
    queryText: string;
    queryEmbedding: number[];
    includePrivate?: boolean;
    limit?: number;
}

export async function hybridSearch(opts: HybridSearchOptions): Promise<RetrievedChunk[]> {
    const { supabaseUrl, supabaseKey, queryText, queryEmbedding } = opts;
    const includePrivate = opts.includePrivate ?? false;
    const limit = opts.limit ?? 6;
    const fetchCount = Math.max(limit * 2, 8);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const rpc = supabase.rpc.bind(supabase) as unknown as (
        fn: string,
        params: Record<string, unknown>
    ) => Promise<{ data: unknown; error: unknown }>;

    const [vectorResult, keywordResult] = await Promise.all([
        rpc("search_knowledge", {
            query_embedding: queryEmbedding,
            match_threshold: 0.5,
            match_count: fetchCount,
            include_private: includePrivate,
        }).catch((error) => {
            console.error("Vector search error:", error);
            return { data: [], error };
        }),
        rpc("keyword_search_knowledge", {
            query_text: queryText,
            match_count: fetchCount,
            include_private: includePrivate,
        }).catch((error) => {
            console.error("Keyword search error:", error);
            return { data: [], error };
        }),
    ]);

    const vectorChunks: RetrievedChunk[] = ((vectorResult.data as VectorRow[]) || []).map((row) => ({
        id: row.id,
        entityId: row.entity_id ?? null,
        content: row.content,
        metadata: row.metadata ?? {},
        score: row.similarity,
    }));

    const keywordChunks: RetrievedChunk[] = ((keywordResult.data as KeywordRow[]) || []).map((row) => ({
        id: row.id,
        entityId: row.entity_id ?? null,
        content: row.content,
        metadata: row.metadata ?? {},
        score: row.rank,
    }));

    const fused = reciprocalRankFusion([vectorChunks, keywordChunks], 60, limit);

    // Graph expansion: pull 1-hop neighbors of the entities behind the top hits.
    const seedEntityIds = Array.from(
        new Set(fused.map((chunk) => chunk.entityId).filter((id): id is string => Boolean(id)))
    );

    if (seedEntityIds.length === 0) return fused;

    const neighborResult = await rpc("traverse_graph", {
        entity_ids: seedEntityIds,
        max_neighbors: limit,
        include_private: includePrivate,
    }).catch((error) => {
        console.error("Graph traversal error:", error);
        return { data: [], error };
    });

    const neighborEntityIds = ((neighborResult.data as NeighborRow[]) || [])
        .map((row) => row.id)
        .filter((id) => !seedEntityIds.includes(id));

    if (neighborEntityIds.length === 0) return fused;

    const { data: neighborChunkRows, error: neighborChunkError } = await supabase
        .from("knowledge_chunks")
        .select("id, entity_id, content, metadata, visibility")
        .in("entity_id", neighborEntityIds);

    if (neighborChunkError || !neighborChunkRows) return fused;

    const fusedIds = new Set(fused.map((chunk) => chunk.id));
    const seenEntities = new Set<string>();
    const minFusedScore = fused.length ? fused[fused.length - 1].score : 0;

    for (const row of neighborChunkRows as Array<{
        id: string;
        entity_id: string | null;
        content: string;
        metadata: Record<string, unknown> | null;
        visibility?: string;
    }>) {
        if (!includePrivate && row.visibility === "private") continue;
        if (fusedIds.has(row.id)) continue;
        if (row.entity_id && seenEntities.has(row.entity_id)) continue; // one chunk per neighbor entity
        if (row.entity_id) seenEntities.add(row.entity_id);
        fused.push({
            id: row.id,
            entityId: row.entity_id ?? null,
            content: row.content,
            metadata: row.metadata ?? {},
            score: minFusedScore * 0.5, // down-weight related-context chunks
        });
    }

    return fused;
}
