/**
 * Verify Knowledge Base Script
 *
 * Quick check to see what's in the knowledge_chunks table
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("❌ Missing Supabase environment variables");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get count
    const { count, error: countError } = await supabase
        .from("knowledge_chunks")
        .select("*", { count: "exact", head: true });

    if (countError) {
        console.error("❌ Error counting chunks:", countError.message);
        process.exit(1);
    }

    console.log(`\n📊 Total chunks in database: ${count}\n`);

    // Get sample data
    const { data, error } = await supabase
        .from("knowledge_chunks")
        .select("id, content, metadata")
        .limit(3);

    if (error) {
        console.error("❌ Error fetching chunks:", error.message);
        process.exit(1);
    }

    console.log("📝 Sample chunks:\n");
    data?.forEach((chunk, i) => {
        console.log(`${i + 1}. Type: ${chunk.metadata.type}${chunk.metadata.title ? ` - ${chunk.metadata.title}` : ""}`);
        console.log(`   Content preview: ${chunk.content.substring(0, 100)}...`);
        console.log();
    });

    // Knowledge graph stats
    const { count: entityCount } = await supabase
        .from("kg_entities")
        .select("*", { count: "exact", head: true });
    const { count: edgeCount } = await supabase
        .from("kg_edges")
        .select("*", { count: "exact", head: true });
    console.log(`🕸️  Graph: ${entityCount ?? "?"} entities, ${edgeCount ?? "?"} edges\n`);

    // Sample 1-hop traversal from a known entity
    const { data: sampleEntity } = await supabase
        .from("kg_entities")
        .select("id, title")
        .limit(1)
        .maybeSingle();

    if (sampleEntity) {
        const traverse = supabase.rpc.bind(supabase) as unknown as (
            fn: string,
            params: Record<string, unknown>
        ) => Promise<{ data: { title: string }[] | null; error: { message: string } | null }>;
        const { data: neighbors, error: traverseError } = await traverse("traverse_graph", {
            entity_ids: [sampleEntity.id],
            max_neighbors: 5,
            include_private: false,
        });

        if (traverseError) {
            console.error("⚠️  traverse_graph error:", traverseError.message);
        } else {
            const titles = (neighbors ?? []).map((n) => n.title).join(", ") || "(none)";
            console.log(`🔗 Neighbors of "${sampleEntity.title}": ${titles}\n`);
        }
    }
}

main().catch(console.error);
