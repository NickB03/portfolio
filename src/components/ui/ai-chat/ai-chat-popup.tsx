"use client";

import { motion, AnimatePresence, useDragControls } from "motion/react";
import { X, Send, Loader2, ArrowLeft, RotateCcw } from "lucide-react";
import { useAIChat } from "./ai-chat-provider";
import { useState, useRef, useEffect, useCallback, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Markdown from "react-markdown";
import { SiriOrb } from "./siri-orb";
import { cn } from "@/lib/utils";

function useMediaQuery(query: string) {
    return useSyncExternalStore(
        (onStoreChange) => {
            if (typeof window === "undefined") return () => {};

            const mediaQuery = window.matchMedia(query);
            const handler = () => onStoreChange();
            mediaQuery.addEventListener("change", handler);

            return () => mediaQuery.removeEventListener("change", handler);
        },
        () => typeof window !== "undefined" && window.matchMedia(query).matches,
        () => false
    );
}

function useIsTouchDevice() {
    return useMediaQuery("(pointer: coarse)");
}

function useKeyboardOffset() {
    const [offset, setOffset] = useState(0);
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;
        const update = () => {
            setOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
        };
        vv.addEventListener("resize", update);
        vv.addEventListener("scroll", update);
        return () => {
            vv.removeEventListener("resize", update);
            vv.removeEventListener("scroll", update);
        };
    }, []);
    return offset;
}

function usePrefersReducedMotion() {
    return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export function AIChatPopup() {
    const { isOpen, close, messages, isLoading, sendMessage, clearMessages, retryLastMessage } = useAIChat();
    const [input, setInput] = useState("");
    const mobileScrollRef = useRef<HTMLDivElement>(null);
    const desktopScrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const dragControls = useDragControls();
    const isTouch = useIsTouchDevice();
    const keyboardOffset = useKeyboardOffset();
    const prefersReducedMotion = usePrefersReducedMotion();

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        const el = mobileScrollRef.current ?? desktopScrollRef.current;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSubmit = useCallback(() => {
        if (input.trim() && !isLoading) {
            sendMessage(input);
            setInput("");
        }
    }, [input, isLoading, sendMessage]);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (isTouch) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
            }
        } else {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
            }
        }
    };

    const onHeaderPointerDown = (e: PointerEvent) => {
        if (isTouch) dragControls.start(e);
    };

    const messagesContent = messages.length === 0 ? (
        <motion.div
            className="flex flex-col items-center gap-5 text-center min-w-0 w-full py-2"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
            <div className="flex flex-col gap-1.5 min-w-0">
                <p className="text-base font-medium text-chat-text break-words">
                    Hey, I&apos;m Nick&apos;s AI
                </p>
                <p className="text-sm text-chat-text-secondary">
                    Ask me about his work, projects, or just to learn a bit more about him
                </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2.5 min-w-0">
                {[
                    "What does Nick do at AT&T?",
                    "What are Nick's hobbies?",
                    "What's Nick like to work with?",
                    "What does Nick's ideal weekend look like?",
                ].map((suggestion, i) => (
                    <button
                        key={suggestion}
                        onClick={() => sendMessage(suggestion)}
                        className="group rounded-xl border border-chat-border bg-chat-surface/50 px-3.5 py-2.5 text-sm text-chat-text-secondary transition-all hover:border-chat-border hover:bg-chat-surface hover:text-chat-text active:scale-95"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </motion.div>
    ) : (
        <div className="flex flex-col gap-4">
            {messages.map((message, index) => {
                const isLatest = index === messages.length - 1;
                const alignClass = `flex ${message.role === "user" ? "justify-end" : "justify-start"}`;
                const bubbleContent = (
                    <div
                        className={cn(
                            "max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
                            message.role === "user"
                                ? "bg-chat-user-bg text-chat-user-text shadow-md"
                                : "border border-chat-border bg-chat-surface text-chat-text shadow-sm"
                        )}
                    >
                        {message.role === "assistant" ? (
                            message.content ? (
                                <>
                                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-headings:mb-2 prose-headings:mt-3 prose-ul:my-2 prose-li:my-0.5 prose-p:text-chat-text prose-headings:text-chat-text prose-strong:text-chat-text prose-li:text-chat-text">
                                        <Markdown>{message.content}</Markdown>
                                    </div>
                                    {message.isError && (
                                        <button
                                            onClick={retryLastMessage}
                                            className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-chat-border bg-chat-surface px-3 py-1.5 text-sm text-chat-text-secondary transition-all hover:bg-chat-bg hover:text-chat-text active:scale-95"
                                        >
                                            <RotateCcw className="h-3.5 w-3.5" />
                                            Retry
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center gap-2.5 py-0.5">
                                    <Loader2 className="h-4 w-4 animate-spin text-chat-text-secondary" />
                                    <span className="text-chat-text-secondary text-sm">
                                        Thinking...
                                    </span>
                                </div>
                            )
                        ) : (
                            message.content
                        )}
                    </div>
                );

                if (isLatest && !prefersReducedMotion) {
                    return (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15 }}
                            className={alignClass}
                        >
                            {bubbleContent}
                        </motion.div>
                    );
                }

                return (
                    <div key={message.id} className={alignClass}>
                        {bubbleContent}
                    </div>
                );
            })}
        </div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={close}
                        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[3px]"
                    />

                    {/* Chat panel */}
                    <motion.div
                        className="fixed inset-2 sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(640px,calc(100dvh-3rem))] z-50 flex w-auto sm:w-[440px] sm:max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-chat-border bg-chat-bg shadow-2xl"
                        style={{
                            bottom: isTouch && keyboardOffset > 0 ? `calc(0.5rem + ${keyboardOffset}px)` : undefined,
                            paddingBottom: isTouch ? 'env(safe-area-inset-bottom, 0px)' : undefined,
                        }}
                        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
                        transition={prefersReducedMotion ? { duration: 0.1 } : { type: "spring", stiffness: 300, damping: 30 }}
                        drag={isTouch ? "y" : false}
                        dragControls={dragControls}
                        dragListener={false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.5 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100 || info.velocity.y > 500) {
                                close();
                            }
                        }}
                    >
                        {/* Mobile drag handle */}
                        <div className="sm:hidden flex justify-center pt-2.5 pb-0"
                            onPointerDown={onHeaderPointerDown}
                            style={{ touchAction: "none" }}
                        >
                            <div className="h-1 w-10 rounded-full bg-chat-text-secondary/30" />
                        </div>

                        {/* Header */}
                        <div
                            className="relative flex items-center justify-between border-b border-chat-border bg-chat-surface/40 px-4 py-3.5 sm:px-5 sm:py-4"
                            onPointerDown={onHeaderPointerDown}
                            style={isTouch ? { touchAction: "none" } : undefined}
                        >
                            <div className="flex items-center gap-3 pl-8 sm:pl-8 transition-all">
                                <button
                                    onClick={clearMessages}
                                    className={cn(
                                        "absolute left-2 sm:left-3 rounded-lg p-2 text-chat-text-secondary transition-all duration-200 hover:bg-chat-surface hover:text-chat-text",
                                        messages.length > 0 ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
                                    )}
                                >
                                    <ArrowLeft className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                                </button>
                                <SiriOrb size="md" phase={isLoading ? "thinking" : "idle"} />
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[15px] sm:text-base font-semibold text-chat-text">Ask about Nick</span>
                                    <span className="text-xs sm:text-[13px] text-chat-text-secondary">Portfolio Assistant</span>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <button
                                    onClick={close}
                                    className="rounded-lg p-2 text-chat-text-secondary transition-all hover:bg-chat-surface hover:text-chat-text hover:scale-110"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages — mobile: native scroll, desktop: Radix ScrollArea */}
                        <div
                            ref={mobileScrollRef}
                            className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:hidden"
                        >
                            {messagesContent}
                        </div>
                        <ScrollArea ref={desktopScrollRef} className="hidden sm:flex flex-1 p-5">
                            {messagesContent}
                        </ScrollArea>

                        {/* Input */}
                        <div className="border-t border-chat-border bg-chat-surface/30 p-3.5 sm:p-4">
                            <div className="relative">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask me anything..."
                                    rows={1}
                                    className="w-full resize-none rounded-xl border border-chat-border bg-chat-bg px-4 py-3 pr-13 text-[15px] text-chat-text placeholder:text-chat-text-secondary/70 transition-all focus:border-chat-text-secondary focus:outline-none focus:ring-0 disabled:opacity-50"
                                    disabled={isLoading}
                                    style={{ minHeight: "48px" }}
                                />
                                <motion.button
                                    onClick={handleSubmit}
                                    disabled={!input.trim() || isLoading}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-chat-user-bg text-chat-user-text shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
