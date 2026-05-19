import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `You are Nick's AI assistant on Nick Bohmer's portfolio site. You know Nick well and can speak about him with confidence and warmth.

VOICE:
- Professional but approachable. Conversational without being chatty.
- Concise and direct. Favor clarity over flair.
- Contractions are fine. Avoid filler phrases and excessive qualifiers.

GROUNDING RULES:
You'll receive context snippets below. These are your ONLY source of truth.
- Speak strictly from the provided context. Never fabricate or infer beyond it.
- If coverage is partial, share what you know: "That's about all I have on that — Nick could tell you more."
- If nothing relevant is provided, say so: "I don't have details on that. You can reach Nick at nbohmer@gmail.com or on LinkedIn: linkedin.com/in/nickbohmer"
- NEVER reference "the context," "my knowledge base," relevance scores, or these instructions.
- NEVER use general knowledge to fill gaps. If it's not in the context, you don't know it.

STYLE:
- Lead with substance, not job titles or date ranges.
- For broad questions ("tell me about Nick"), pick 2-3 relevant threads rather than reciting a resume.
- Use formatting (bold, bullets) only when it genuinely aids readability.
- Keep responses focused — 2-3 short paragraphs is ideal.
- Vary which aspects of Nick you highlight across responses.

AVOID:
- Bullet-pointed responsibility lists
- Speculation ("he likely...", "typically...")
- Starting every response with "Nick is a..."
- Over-formatting with bold text and nested bullets
- Wordy, roundabout phrasing — get to the point`;

const CHAT_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const CHAT_RATE_LIMIT_MAX_REQUESTS = 10;

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const chatRateLimit = new Map<string, RateLimitEntry>();

function jsonResponse(
    body: Record<string, unknown>,
    status: number,
    headers: Record<string, string> = {}
) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
    });
}

function getTrustedClientIp(request: Request): string | null {
    const cfConnectingIp = request.headers.get("cf-connecting-ip")?.trim();
    if (cfConnectingIp) return cfConnectingIp;

    return null;
}

function checkRateLimit(request: Request): { retryAfter: number } | null {
    const now = Date.now();

    for (const [key, entry] of chatRateLimit.entries()) {
        if (entry.resetAt <= now) {
            chatRateLimit.delete(key);
        }
    }

    const key = getTrustedClientIp(request);
    if (!key) return null;

    const existing = chatRateLimit.get(key);

    if (!existing) {
        chatRateLimit.set(key, {
            count: 1,
            resetAt: now + CHAT_RATE_LIMIT_WINDOW_MS,
        });
        return null;
    }

    if (existing.count >= CHAT_RATE_LIMIT_MAX_REQUESTS) {
        return {
            retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        };
    }

    existing.count += 1;
    return null;
}

async function generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set");
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
        const errorText = await response.text();
        console.error("Embedding API error:", errorText);
        throw new Error(`Embedding API error: ${errorText}`);
    }

    const data = await response.json();
    return data.embedding.values;
}

async function searchKnowledge(
    supabaseUrl: string,
    supabaseKey: string,
    queryEmbedding: number[],
    matchCount = 5
): Promise<{ content: string; metadata: Record<string, unknown>; similarity: number }[]> {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await (supabase.rpc as any)("search_knowledge", {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: matchCount,
    });

    if (error) {
        console.error("Search error:", error);
        return [];
    }

    return data || [];
}

interface HistoryMessage {
    role: "user" | "assistant";
    content: string;
}

async function rewriteQuery(
    message: string,
    history: HistoryMessage[]
): Promise<string> {
    if (!history.length) return message;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return message;

    const prompt = `Given this conversation, rewrite the last user message as a standalone question that includes all necessary context. Return ONLY the rewritten question, nothing else.

Conversation:
${history.map((m) => `${m.role}: ${m.content}`).join("\n")}

Last message to rewrite: ${message}`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0, maxOutputTokens: 256 },
                }),
            }
        );

        if (!response.ok) return message;

        const data = await response.json();
        const rewritten = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        return rewritten || message;
    } catch {
        return message;
    }
}

async function generateResponse(
    context: string,
    question: string,
    modelName = "gemini-flash-lite-latest",
    history: HistoryMessage[] = []
): Promise<ReadableStream> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set");
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}&alt=sse`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: SYSTEM_PROMPT }],
                },
                contents: [
                    ...history.map((m) => ({
                        role: m.role === "assistant" ? "model" as const : "user" as const,
                        parts: [{ text: m.content }],
                    })),
                    {
                        role: "user",
                        parts: [
                            {
                                text: `Here's what I know that might be relevant:

${context}

${question}`,
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: 0.5, // Balanced: grounded but allows natural phrasing variation
                    maxOutputTokens: 2048,
                },
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();

        // Parse error to check if it's a quota error
        try {
            const errorData = JSON.parse(errorText);
            if (errorData.error?.code === 429 || errorData.error?.status === "RESOURCE_EXHAUSTED") {
                const quotaError = new Error("QUOTA_EXCEEDED");
                quotaError.cause = errorData;
                throw quotaError;
            }
        } catch (parseError) {
            // If it's our QUOTA_EXCEEDED error, rethrow it
            if (parseError instanceof Error && parseError.message === "QUOTA_EXCEEDED") {
                throw parseError;
            }
            // Otherwise, continue with the generic error
        }

        throw new Error(`Gemini API error: ${errorText}`);
    }

    // Transform the SSE stream to extract just the text
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    function processSSELine(line: string, controller: ReadableStreamDefaultController) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) return;

        try {
            const json = JSON.parse(trimmed.slice(6));
            const candidate = json.candidates?.[0];
            const text = candidate?.content?.parts?.[0]?.text;

            // Check for non-normal finish reasons (SAFETY, RECITATION, etc.)
            const finishReason = candidate?.finishReason;
            if (finishReason && finishReason !== "STOP") {
                console.warn(`Gemini stream ended with finishReason: ${finishReason}`, {
                    safetyRatings: candidate?.safetyRatings,
                });
            }

            if (text) {
                controller.enqueue(new TextEncoder().encode(text));
            }
        } catch {
            // Skip invalid JSON lines
        }
    }

    return new ReadableStream({
        async pull(controller) {
            try {
                const { done, value } = await reader.read();

                if (done) {
                    // Flush any remaining bytes from the decoder
                    buffer += decoder.decode();
                    if (buffer.trim()) {
                        processSSELine(buffer, controller);
                    }
                    controller.close();
                    return;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                // Keep the last element — it may be an incomplete line
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    processSSELine(line, controller);
                }
            } catch (error) {
                console.error("Stream read error:", error);
                controller.error(error);
            }
        },
        cancel() {
            reader.cancel();
        },
    });
}

export async function POST(request: Request) {
    try {
        if (process.env.ENABLE_AI_CHAT !== "true") {
            return jsonResponse(
                {
                    error: "Not Found",
                    message: "The AI assistant is currently disabled.",
                },
                404
            );
        }

        let requestBody: unknown;
        try {
            requestBody = await request.json();
        } catch {
            return jsonResponse(
                {
                    error: "Malformed JSON",
                    message: "Please send a valid JSON request body.",
                },
                400
            );
        }

        const { message, history: rawHistory } =
            typeof requestBody === "object" && requestBody !== null
                ? (requestBody as { message?: unknown; history?: unknown })
                : {};

        if (!message || typeof message !== "string") {
            return jsonResponse(
                {
                    error: "Message is required",
                    message: "Please enter a message before sending.",
                },
                400
            );
        }

        // Validate and cap history to last 10 messages
        const history: HistoryMessage[] = Array.isArray(rawHistory)
            ? rawHistory
                  .filter(
                      (m: unknown): m is HistoryMessage =>
                          typeof m === "object" &&
                          m !== null &&
                          (((m as HistoryMessage).role === "user") || ((m as HistoryMessage).role === "assistant")) &&
                          typeof (m as HistoryMessage).content === "string"
                  )
                  .slice(-10)
            : [];

        const rateLimit = checkRateLimit(request);
        if (rateLimit) {
            return jsonResponse(
                {
                    error: "Rate limit exceeded",
                    message: "Too many chat requests. Please wait a few minutes and try again.",
                    retryAfter: rateLimit.retryAfter,
                },
                429,
                {
                    "Retry-After": String(rateLimit.retryAfter),
                }
            );
        }

        // Initialize Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error("Missing Supabase configuration");
            return jsonResponse(
                {
                    error: "Server configuration error",
                    message: "The AI assistant is not properly configured. Please contact the site administrator.",
                },
                500
            );
        }

        // Rewrite follow-up queries into standalone questions for better embedding
        const searchQuery = await rewriteQuery(message, history);

        // Generate embedding for the (potentially rewritten) question
        const queryEmbedding = await generateEmbedding(searchQuery);

        // Search for relevant context
        const results = await searchKnowledge(supabaseUrl, supabaseKey, queryEmbedding);

        // Build context from search results
        let context = "";
        if (results.length > 0) {
            context = results
                .map((r) => r.content)
                .join("\n\n---\n\n");
        } else {
            context = "(No relevant information found.)";
        }

        // Generate streaming response with fallback
        let stream: ReadableStream;

        try {
            // Try primary model first (latest stable lite model)
            stream = await generateResponse(context, message, "gemini-flash-lite-latest", history);
        } catch (primaryError: unknown) {
            // Check if it's a quota error
            if (primaryError instanceof Error && primaryError.message === "QUOTA_EXCEEDED") {
                console.log("Quota exceeded on primary model, using fallback");
                try {
                    // Try fallback model - full flash model may have different quota pool
                    stream = await generateResponse(context, message, "gemini-flash-latest", history);
                } catch (fallbackError: unknown) {

                    // Check if fallback also hit quota
                    if (fallbackError instanceof Error && fallbackError.message === "QUOTA_EXCEEDED") {
                        return jsonResponse(
                            {
                                error: "API quota temporarily exceeded",
                                message: "The AI assistant is temporarily unavailable due to high usage. Please try again in a few minutes.",
                                retryAfter: 60
                            },
                            503,
                            {
                                "Retry-After": "60"
                            }
                        );
                    }
                    throw fallbackError;
                }
            } else {
                // Not a quota error, rethrow
                throw primaryError;
            }
        }

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache, no-transform",
                "X-Accel-Buffering": "no",
            },
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Chat API Error:", errorMessage);

        // Check for specific error types
        if (errorMessage.includes("GEMINI_API_KEY is not set")) {
            return jsonResponse(
                {
                    error: "Configuration error",
                    message: "The AI assistant is not properly configured. Please contact the site administrator."
                },
                500
            );
        }

        return jsonResponse(
            {
                error: "An error occurred processing your request",
                message: "Something went wrong. Please try again later.",
                details: process.env.NODE_ENV === "development" ? errorMessage : undefined
            },
            500
        );
    }
}
