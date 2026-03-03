'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Message {
    role: 'user' | 'model';
    content: string;
}

// Gemini history format
interface GeminiPart {
    role: 'user' | 'model';
    parts: [{ text: string }];
}

// ─── Markdown renderer (final summary only) ─────────────────────────────────

function TriageSummary({ text }: { text: string }) {
    const lines = text.split('\n').filter(Boolean);
    return (
        <div className="space-y-1 text-sm">
            {lines.map((line, i) => {
                // Bold **Label:** Value
                const bold = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                return (
                    <p
                        key={i}
                        dangerouslySetInnerHTML={{ __html: bold }}
                        className="leading-relaxed"
                    />
                );
            })}
        </div>
    );
}

// ─── Main Widget ─────────────────────────────────────────────────────────────

const GREETING = "Hi, I'm your AI health assistant. What symptoms are you experiencing today?";

export default function AiTriageWidget() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', content: GREETING },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [triageComplete, setTriageComplete] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to latest message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const buildHistory = (msgs: Message[]): GeminiPart[] =>
        msgs.map((m) => ({
            role: m.role,
            parts: [{ text: m.content }],
        }));

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || loading || triageComplete) return;

        const userMsg: Message = { role: 'user', content: text };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInput('');
        setLoading(true);

        try {
            // Send all prior messages as history, current message separately
            const history = buildHistory(updatedMessages.slice(0, -1));
            const { data } = await api.post('/telemedicine/api/triage/chat/', {
                message: text,
                history,
            });

            const aiMsg: Message = { role: 'model', content: data.reply };
            setMessages((prev) => [...prev, aiMsg]);

            if (data.is_final) {
                setTriageComplete(true);
            }
        } catch (err: any) {
            const errText =
                err?.response?.data?.error || 'Sorry, something went wrong. Please try again.';
            setMessages((prev) => [...prev, { role: 'model', content: errText }]);
        } finally {
            setLoading(false);
        }
    };

    const resetChat = () => {
        setMessages([{ role: 'model', content: GREETING }]);
        setTriageComplete(false);
        setInput('');
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100]">
            {/* Chat window */}
            {open && (
                <div className="fixed bottom-24 right-6 w-96 h-[500px] flex flex-col overflow-hidden rounded-xl shadow-2xl z-[100] border border-border bg-white dark:bg-slate-950">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground m-0 shrink-0">
                        <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            <span className="font-semibold text-sm">AI Triage Assistant</span>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-white/20 transition-colors"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Chat area */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 m-0 bg-slate-50/80 dark:bg-slate-900/80">
                        {messages.map((msg, idx) => {
                            const isUser = msg.role === 'user';
                            const isFinalMsg =
                                !isUser && idx === messages.length - 1 && triageComplete;
                            return (
                                <div
                                    key={idx}
                                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`${
                                            isUser
                                                ? 'max-w-[80%] p-3 rounded-2xl bg-primary text-primary-foreground text-sm shadow-sm'
                                                : isFinalMsg
                                                ? 'max-w-[80%] p-3 rounded-2xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-foreground text-sm shadow-sm'
                                                : 'max-w-[80%] p-3 rounded-2xl bg-white dark:bg-slate-800 border border-border text-foreground text-sm shadow-sm'
                                        }`}
                                    >
                                        {isFinalMsg ? (
                                            <TriageSummary text={msg.content} />
                                        ) : (
                                            msg.content
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Typing indicator */}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1 shadow-sm">
                                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Input area */}
                    <div className="p-4 bg-background border-t m-0 shrink-0">
                        {triageComplete ? (
                            <div className="w-full text-center space-y-2">
                                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                                    ✓ Triage Complete. Summary generated.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={resetChat}
                                >
                                    Start New Triage
                                </Button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder="Describe your symptoms..."
                                    disabled={loading}
                                    className="flex-1 text-sm h-9"
                                />
                                <Button
                                    size="icon"
                                    className="h-9 w-9 shrink-0"
                                    onClick={sendMessage}
                                    disabled={loading || !input.trim()}
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* FAB button */}
            <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform"
                onClick={() => setOpen((v) => !v)}
                aria-label="Toggle AI Triage Assistant"
            >
                {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
            </Button>
        </div>
    );
}
