"use client";

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
    type ReactNode,
} from "react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    isError?: boolean;
}

interface AIChatContextType {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
    messages: Message[];
    isLoading: boolean;
    sendMessage: (content: string) => Promise<void>;
    clearMessages: () => void;
    retryLastMessage: () => void;
}

const AIChatContext = createContext<AIChatContextType | null>(null);

export function useAIChat() {
    const context = useContext(AIChatContext);
    if (!context) {
        // Return no-op functions when not in provider (e.g., when AI chat is disabled)
        return {
            isOpen: false,
            open: () => {},
            close: () => {},
            toggle: () => {},
            messages: [],
            isLoading: false,
            sendMessage: async () => {},
            clearMessages: () => {},
            retryLastMessage: () => {},
        };
    }
    return context;
}

interface AIChatProviderProps {
    children: ReactNode;
}

const CONNECTION_TIMEOUT_MS = 60_000; // Time allowed for initial connection (embedding + search + API call)
const STREAM_CHUNK_TIMEOUT_MS = 15_000; // Max time between streamed chunks before considering it stalled

export function AIChatProvider({ children }: AIChatProviderProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const lastUserMessageRef = useRef<string>("");
    const abortControllerRef = useRef<AbortController | null>(null);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

    const clearMessages = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsLoading(false);
        setMessages([]);
    }, []);

    const sendMessage = useCallback(async (
        content: string,
        options: { appendUser?: boolean; replaceLastError?: boolean } = {}
    ) => {
        if (!content.trim() || isLoading) return;

        const trimmedContent = content.trim();
        const appendUser = options.appendUser ?? true;
        const baseMessages = options.replaceLastError &&
            messages[messages.length - 1]?.role === "assistant" &&
            messages[messages.length - 1]?.isError
            ? messages.slice(0, -1)
            : messages;
        const historySource = !appendUser &&
            baseMessages[baseMessages.length - 1]?.role === "user" &&
            baseMessages[baseMessages.length - 1]?.content === trimmedContent
            ? baseMessages.slice(0, -1)
            : baseMessages;

        lastUserMessageRef.current = trimmedContent;

        // Build history from existing messages before adding the new one
        const history = historySource
            .filter((m) => m.content && !m.isError)
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content }));

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: "user",
            content: trimmedContent,
        };

        setIsLoading(true);

        // Create placeholder for assistant response
        const assistantId = `assistant-${Date.now()}`;
        const assistantMessage: Message = {
            id: assistantId,
            role: "assistant",
            content: "",
        };

        setMessages(appendUser
            ? [...baseMessages, userMessage, assistantMessage]
            : [...baseMessages, assistantMessage]
        );

        const controller = new AbortController();
        abortControllerRef.current = controller;
        // Connection timeout: covers embedding, vector search, and Gemini API setup
        const connectionTimeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT_MS);
        let chunkTimeoutId: ReturnType<typeof setTimeout> | undefined;

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: trimmedContent, history }),
                signal: controller.signal,
            });

            // Connection established — clear the connection timeout
            clearTimeout(connectionTimeoutId);

            if (!response.ok) {
                // Try to parse error response
                const contentType = response.headers.get("content-type");
                if (contentType?.includes("application/json")) {
                    const errorData = await response.json();
                    const structuredMessage =
                        typeof errorData.message === "string"
                            ? errorData.message
                            : typeof errorData.error === "string"
                                ? errorData.error
                                : null;

                    // Handle specific error types
                    if (response.status === 503 && errorData.error === "API quota temporarily exceeded") {
                        setMessages((prev) =>
                            prev.map((msg) =>
                                msg.id === assistantId
                                    ? {
                                        ...msg,
                                        content: errorData.message || "The AI assistant is temporarily unavailable due to high usage. Please try again in a few minutes.",
                                        isError: true,
                                    }
                                    : msg
                            )
                        );
                        return;
                    }

                    // Handle other structured errors
                    if (structuredMessage) {
                        setMessages((prev) =>
                            prev.map((msg) =>
                                msg.id === assistantId
                                    ? {
                                        ...msg,
                                        content: structuredMessage,
                                        isError: true,
                                    }
                                    : msg
                            )
                        );
                        return;
                    }
                }

                throw new Error("Failed to get response");
            }

            // Handle streaming response
            const reader = response.body?.getReader();
            if (!reader) throw new Error("No response body");

            const decoder = new TextDecoder();
            let accumulatedContent = "";

            // Per-chunk idle timeout: detects stalled streams
            const resetChunkTimeout = () => {
                if (chunkTimeoutId) clearTimeout(chunkTimeoutId);
                chunkTimeoutId = setTimeout(() => controller.abort(), STREAM_CHUNK_TIMEOUT_MS);
            };

            resetChunkTimeout();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                resetChunkTimeout();

                const chunk = decoder.decode(value, { stream: true });
                accumulatedContent += chunk;

                // Update the assistant message with accumulated content
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === assistantId
                            ? { ...msg, content: accumulatedContent }
                            : msg
                    )
                );
            }

            if (chunkTimeoutId) clearTimeout(chunkTimeoutId);

            // Flush any remaining bytes from the decoder
            const remaining = decoder.decode();
            if (remaining) {
                accumulatedContent += remaining;
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === assistantId
                            ? { ...msg, content: accumulatedContent }
                            : msg
                    )
                );
            }
        } catch (error) {
            console.error("Chat error:", error);

            const isTimeout = error instanceof DOMException && error.name === "AbortError";
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantId
                        ? {
                            ...msg,
                            content: isTimeout
                                ? "Request timed out. Please check your connection and try again."
                                : "Sorry, I couldn't process your request. Please try again.",
                            isError: true,
                        }
                        : msg
                )
            );
        } finally {
            clearTimeout(connectionTimeoutId);
            if (chunkTimeoutId) clearTimeout(chunkTimeoutId);
            abortControllerRef.current = null;
            setIsLoading(false);
        }
    }, [isLoading, messages]);

    const retryLastMessage = useCallback(() => {
        if (!lastUserMessageRef.current || isLoading) return;
        const msg = lastUserMessageRef.current;
        void sendMessage(msg, { appendUser: false, replaceLastError: true });
    }, [isLoading, sendMessage]);

    return (
        <AIChatContext.Provider
            value={{
                isOpen,
                open,
                close,
                toggle,
                messages,
                isLoading,
                sendMessage,
                clearMessages,
                retryLastMessage,
            }}
        >
            {children}
        </AIChatContext.Provider>
    );
}
