"use client";

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
    type ReactNode,
} from "react";

export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    isError?: boolean;
}

interface SendMessageOptions {
    appendUser?: boolean;
    replaceLastError?: boolean;
    retryAssistantId?: string;
}

interface RetryTurn {
    content: string;
    historyMessages: Message[];
}

export function getRetryTurn(messages: Message[], failedAssistantId: string): RetryTurn | null {
    const assistantIndex = messages.findIndex(
        (message) =>
            message.id === failedAssistantId &&
            message.role === "assistant" &&
            message.isError
    );

    if (assistantIndex <= 0) return null;

    for (let index = assistantIndex - 1; index >= 0; index--) {
        const message = messages[index];
        if (message?.role === "user" && message.content.trim()) {
            return {
                content: message.content,
                historyMessages: messages.slice(0, index),
            };
        }
    }

    return null;
}

interface AIChatContextType {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
    messages: Message[];
    isLoading: boolean;
    sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>;
    clearMessages: () => void;
    retryLastMessage: (failedAssistantId?: string) => void;
}

const AIChatContext = createContext<AIChatContextType | null>(null);

export function useAIChat(): AIChatContextType {
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
            sendMessage: async (_content: string, _options?: SendMessageOptions) => {},
            clearMessages: () => {},
            retryLastMessage: (_failedAssistantId?: string) => {},
        };
    }
    return context;
}

interface AIChatProviderProps {
    children: ReactNode;
}

const CONNECTION_TIMEOUT_MS = 60_000; // Time allowed for initial connection (embedding + search + API call)
const STREAM_CHUNK_TIMEOUT_MS = 15_000; // Max time between streamed chunks before considering it stalled

function isAbortError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError"
    );
}

export function getAssistantFailureState(
    error: unknown,
    streamedContent: string
): Pick<Message, "content" | "isError"> {
    const isTimeout = isAbortError(error);

    if (isTimeout && streamedContent.trim().length > 0) {
        return {
            content: streamedContent,
            isError: false,
        };
    }

    return {
        content: isTimeout
            ? "Request timed out. Please check your connection and try again."
            : "Sorry, I couldn't process your request. Please try again.",
        isError: true,
    };
}

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
        options: SendMessageOptions = {}
    ) => {
        if (isLoading) return;

        const retryTurn = options.retryAssistantId
            ? getRetryTurn(messages, options.retryAssistantId)
            : null;
        const trimmedContent = retryTurn?.content.trim() ?? content.trim();
        if (!trimmedContent) return;

        const appendUser = retryTurn ? false : options.appendUser ?? true;
        const baseMessages = retryTurn
            ? messages
            : options.replaceLastError &&
            messages[messages.length - 1]?.role === "assistant" &&
            messages[messages.length - 1]?.isError
                ? messages.slice(0, -1)
                : messages;
        const historySource = retryTurn
            ? retryTurn.historyMessages
            : !appendUser &&
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
        const assistantId = options.retryAssistantId ?? `assistant-${Date.now()}`;
        const assistantMessage: Message = {
            id: assistantId,
            role: "assistant",
            content: "",
        };

        setMessages(
            retryTurn
                ? messages.map((message) =>
                    message.id === assistantId ? assistantMessage : message
                )
                : appendUser
                    ? [...baseMessages, userMessage, assistantMessage]
                    : [...baseMessages, assistantMessage]
        );

        const controller = new AbortController();
        abortControllerRef.current = controller;
        // Connection timeout: covers embedding, vector search, and Gemini API setup
        const connectionTimeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT_MS);
        let chunkTimeoutId: ReturnType<typeof setTimeout> | undefined;
        let accumulatedContent = "";

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
            const failureState = getAssistantFailureState(error, accumulatedContent);
            if (failureState.isError) {
                console.error("Chat error:", error);
            }

            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantId
                        ? {
                            ...msg,
                            ...failureState,
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

    const retryLastMessage = useCallback((failedAssistantId?: string) => {
        if (isLoading) return;
        if (failedAssistantId) {
            const retryTurn = getRetryTurn(messages, failedAssistantId);
            if (!retryTurn) return;

            void sendMessage(retryTurn.content, { retryAssistantId: failedAssistantId });
            return;
        }

        if (!lastUserMessageRef.current) return;
        const msg = lastUserMessageRef.current;
        void sendMessage(msg, { appendUser: false, replaceLastError: true });
    }, [isLoading, messages, sendMessage]);

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
