/**
 * Seed Knowledge Base Script
 *
 * Compiles the in-repo knowledge graph into Supabase:
 *   - reads content/knowledge/**\/*.md (frontmatter + [[wikilinks]])
 *   - builds kg_entities + kg_edges (edges derived from wikilinks)
 *   - chunks each file, embeds via Gemini, and stores in knowledge_chunks
 *   - optionally folds in nick-info.md as gated (private) personal notes
 *
 * Usage: npx tsx scripts/seed-knowledge.ts
 * Set INCLUDE_PERSONAL_KNOWLEDGE=true to include `visibility: private` knowledge
 * files and nick-info.md chunks locally.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { join, relative } from "path";
import { config } from "dotenv";
import {
    parseKnowledgeFile,
    resolveEdges,
    type ParsedEntity,
} from "./lib/knowledge-parser";

// Load environment variables from .env.local
config({ path: ".env.local" });

const KNOWLEDGE_DIR = join(process.cwd(), "content", "knowledge");

interface KnowledgeChunk {
    content: string;
    entityId: string | null;
    visibility: "public" | "private";
    metadata: {
        source: string;
        type: string;
        title?: string;
        company?: string;
        period?: string;
        section?: string;
        topics?: string[];
    };
}

// --- nick-info.md (optional, gated, personal) -----------------------------

// Map section titles to type and topics for richer metadata
const SECTION_METADATA: Record<string, { type: string; topics: string[] }> = {
    "core identity": { type: "personal", topics: ["name", "location", "identity"] },
    "family & home life": { type: "family", topics: ["family", "home"] },
    "hobbies & interests": { type: "hobbies", topics: ["hobbies"] },
    "photography & video": { type: "hobbies", topics: ["photography", "video", "creative"] },
    "personality": { type: "values", topics: ["personality", "traits", "character"] },
    "habits & quirks": { type: "preferences", topics: ["habits"] },
    "books, tv & music": { type: "hobbies", topics: ["entertainment"] },
    "gaming": { type: "hobbies", topics: ["gaming", "video-games"] },
    "values & principles": { type: "values", topics: ["values", "principles", "philosophy"] },
    "how i learn": { type: "values", topics: ["learning", "hands-on", "style"] },
    "about this ai assistant": { type: "personal", topics: ["ai-assistant", "rag", "portfolio"] },
};

function parsePersonalKnowledge(): KnowledgeChunk[] {
    const chunks: KnowledgeChunk[] = [];

    try {
        const filePath = join(process.cwd(), "nick-info.md");
        const content = readFileSync(filePath, "utf-8");
        const sections = content.split(/^## /m).filter((s) => s.trim());

        for (const section of sections) {
            const lines = section.split("\n");
            const sectionTitle = lines[0].trim();

            if (sectionTitle.startsWith("Nick Bohmer") || sectionTitle.includes("---")) {
                continue;
            }

            const sectionContent = lines.slice(1).join("\n").trim();
            if (!sectionContent) continue;

            const meta = SECTION_METADATA[sectionTitle.toLowerCase()] ?? { type: "personal", topics: [] };

            chunks.push({
                content: sectionContent,
                entityId: null,
                visibility: "private",
                metadata: {
                    source: "personal-knowledge",
                    type: meta.type,
                    section: sectionTitle,
                    topics: meta.topics,
                },
            });
        }

        console.log(`   ✓ Parsed ${chunks.length} sections from nick-info.md`);
    } catch (error) {
        console.warn(`   ⚠️  Could not read nick-info.md: ${error}`);
    }

    return chunks;
}

// --- knowledge folder ------------------------------------------------------

function listMarkdownFiles(dir: string): string[] {
    const out: string[] = [];
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return out;
    }
    for (const entry of entries) {
        const name = entry.name.toString();
        const full = join(dir, name);
        if (entry.isDirectory()) {
            out.push(...listMarkdownFiles(full));
        } else if (entry.isFile() && name.endsWith(".md")) {
            out.push(full);
        }
    }
    return out;
}

function loadKnowledgeEntities(): ParsedEntity[] {
    const files = listMarkdownFiles(KNOWLEDGE_DIR);
    const entities: ParsedEntity[] = [];
    const seenIds = new Set<string>();

    for (const file of files) {
        const raw = readFileSync(file, "utf-8");
        const relPath = relative(KNOWLEDGE_DIR, file);
        const entity = parseKnowledgeFile(raw, relPath);

        if (!entity.id) {
            console.warn(`   ⚠️  Skipping ${relPath}: missing id`);
            continue;
        }
        if (seenIds.has(entity.id)) {
            console.warn(`   ⚠️  Duplicate id "${entity.id}" in ${relPath} — skipping`);
            continue;
        }
        seenIds.add(entity.id);
        entities.push(entity);
    }

    return entities;
}

function entityChunks(entity: ParsedEntity): KnowledgeChunk[] {
    return entity.chunks.map((chunk) => ({
        content: chunk.content,
        entityId: entity.id,
        visibility: entity.visibility,
        metadata: {
            source: "knowledge",
            type: entity.type,
            title: entity.title,
            section: chunk.section,
            topics: entity.tags,
        },
    }));
}

// --- embeddings ------------------------------------------------------------

async function generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set");
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "models/gemini-embedding-001",
                content: { parts: [{ text }] },
            }),
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Embedding API error: ${error}`);
    }

    const data = await response.json();
    return data.embedding.values;
}

// --- main ------------------------------------------------------------------

async function main() {
    console.log("🚀 Starting knowledge base seeding...\n");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("❌ Missing Supabase environment variables");
        console.error("   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
        process.exit(1);
    }
    if (!geminiKey) {
        console.error("❌ Missing GEMINI_API_KEY environment variable");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const includePersonal = process.env.INCLUDE_PERSONAL_KNOWLEDGE === "true";

    // 1. Load + gate knowledge entities
    console.log("📝 Loading knowledge files from content/knowledge...");
    const allEntities = loadKnowledgeEntities();
    const entities = allEntities.filter((e) => includePersonal || e.visibility === "public");
    const droppedPrivate = allEntities.length - entities.length;
    console.log(
        `   ✓ Loaded ${entities.length} entities` +
            (droppedPrivate ? ` (${droppedPrivate} private entities gated out)` : "")
    );

    // 2. Resolve graph edges from wikilinks (only among included entities)
    const { edges, danglingLinks } = resolveEdges(entities);
    console.log(`   ✓ Resolved ${edges.length} graph edges`);
    for (const { src, target } of danglingLinks) {
        console.warn(`   ⚠️  Dangling wikilink in "${src}": [[${target}]] did not resolve`);
    }

    // 3. Build chunks
    const knowledgeChunks = entities.flatMap(entityChunks);
    const personalChunks = includePersonal ? parsePersonalKnowledge() : [];
    if (!includePersonal) {
        console.log("📚 Skipping personal/private knowledge (set INCLUDE_PERSONAL_KNOWLEDGE=true to include it)");
    }
    const chunks = [...knowledgeChunks, ...personalChunks];
    console.log(`\n📊 Total chunks to process: ${chunks.length}\n`);

    // 4. Clear existing data (edges -> entities -> chunks)
    console.log("🗑️  Clearing existing knowledge...");
    await supabase.from("kg_edges").delete().neq("src_id", " ");
    await supabase.from("kg_entities").delete().neq("id", " ");
    const { error: deleteError } = await supabase
        .from("knowledge_chunks")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
    if (deleteError) {
        console.error("❌ Error clearing chunks:", deleteError.message);
    }

    // 5. Insert entities
    if (entities.length > 0) {
        const { error: entityError } = await supabase.from("kg_entities").insert(
            entities.map((e) => ({
                id: e.id,
                type: e.type,
                title: e.title,
                aliases: e.aliases,
                tags: e.tags,
                visibility: e.visibility,
                summary: e.summary,
            }))
        );
        if (entityError) {
            console.error("❌ Error inserting entities:", entityError.message);
        } else {
            console.log(`   ✓ Inserted ${entities.length} entities`);
        }
    }

    // 6. Embed + insert chunks
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const label = chunk.metadata.title ?? chunk.metadata.section ?? chunk.metadata.type;
        console.log(`📊 Processing chunk ${i + 1}/${chunks.length}: ${chunk.metadata.type} - ${label}`);

        try {
            const embedding = await generateEmbedding(chunk.content);
            const { error: insertError } = await supabase.from("knowledge_chunks").insert({
                content: chunk.content,
                entity_id: chunk.entityId,
                visibility: chunk.visibility,
                metadata: chunk.metadata,
                embedding,
            });
            if (insertError) {
                console.error(`   ❌ Insert error: ${insertError.message}`);
            }
            await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
            console.error(`   ❌ Error: ${error}`);
        }
    }

    // 7. Insert edges
    if (edges.length > 0) {
        const { error: edgeError } = await supabase.from("kg_edges").insert(
            edges.map((e) => ({ src_id: e.src, dst_id: e.dst, relation: "references" }))
        );
        if (edgeError) {
            console.error("❌ Error inserting edges:", edgeError.message);
        } else {
            console.log(`\n   ✓ Inserted ${edges.length} edges`);
        }
    }

    // 8. Verify
    const { count } = await supabase
        .from("knowledge_chunks")
        .select("*", { count: "exact", head: true });
    console.log(`\n✅ Done! ${count ?? "?"} chunks, ${entities.length} entities, ${edges.length} edges stored.`);
}

main().catch(console.error);
