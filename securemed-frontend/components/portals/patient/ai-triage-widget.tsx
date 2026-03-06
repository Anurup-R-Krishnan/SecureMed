'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, X, Send, Loader2, CalendarCheck, RefreshCw } from 'lucide-react';
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

interface Doctor {
    id: number;
    name: string;
    specialty: string;
    specialty_display: string;
}

type TriageStatus = 'idle' | 'searching_doctor' | 'waiting_for_doctor' | 'approved' | 'declined';

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
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', content: GREETING },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [triageComplete, setTriageComplete] = useState(false);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [triageStatus, setTriageStatus] = useState<TriageStatus>('idle');
    const [submittedTriageId, setSubmittedTriageId] = useState<number | null>(null);
    const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
    const [sentToDoctor, setSentToDoctor] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to latest message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Poll for doctor approval when in waiting state
    const pollStatus = useCallback(async () => {
        if (!submittedTriageId) return;
        try {
            const { data } = await api.get(`/telemedicine/triage/status/${submittedTriageId}/`);
            if (data.status === 'APPROVED') {
                setTriageStatus('approved');
            } else if (data.status === 'DECLINED') {
                setTriageStatus('declined');
            }
        } catch {
            // silently ignore poll errors
        }
    }, [submittedTriageId]);

    useEffect(() => {
        if (triageStatus !== 'waiting_for_doctor' || !submittedTriageId) return;
        // Kick off immediately, then every 5s
        pollStatus();
        const interval = setInterval(pollStatus, 5000);
        return () => clearInterval(interval);
    }, [triageStatus, submittedTriageId, pollStatus]);

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
            }, { timeout: 120000 }); // 120s: up to 3 model attempts × 30s + headroom

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

    const findSpecialist = async () => {
        setTriageStatus('searching_doctor');
        try {
            const { data } = await api.get('/auth/doctors/search/');
            setDoctors(data);
        } catch {
            setTriageStatus('idle');
        }
    };

    const submitTriage = async (doctor: Doctor) => {
        const aiSummary = messages[messages.length - 1]?.content ?? '';
        try {
            const { data } = await api.post('/telemedicine/triage/submit/', {
                doctor_id: doctor.id,
                ai_summary: aiSummary,
            });
            setSubmittedTriageId(data.triage_id);
            setSelectedDoctorId(doctor.id);
            setSentToDoctor(doctor.name);
            setTriageStatus('waiting_for_doctor');
        } catch {
            // stay in searching_doctor so user can retry
        }
    };

    const resetChat = () => {
        setMessages([{ role: 'model', content: GREETING }]);
        setTriageComplete(false);
        setInput('');
        setDoctors([]);
        setTriageStatus('idle');
        setSubmittedTriageId(null);
        setSelectedDoctorId(null);
        setSentToDoctor('');
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
                            <div className="w-full space-y-2">
                                <p className="text-xs text-center text-green-600 dark:text-green-400 font-medium">
                                    ✓ Triage Complete. Summary generated.
                                </p>

                                {/* Doctor list */}
                                {triageStatus === 'searching_doctor' && (
                                    <div className="rounded-xl border border-border bg-white dark:bg-slate-800 p-2 space-y-1 max-h-44 overflow-y-auto shadow-sm">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Available Specialists</p>
                                        {doctors.length === 0 ? (
                                            <p className="text-sm text-muted-foreground px-1">No doctors found.</p>
                                        ) : (
                                            doctors.map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="flex items-center justify-between gap-2 py-1.5 border-b border-border/50 last:border-0"
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{doc.name}</p>
                                                        {doc.specialty_display && (
                                                            <p className="text-xs text-muted-foreground">{doc.specialty_display}</p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => submitTriage(doc)}
                                                        className="shrink-0 px-3 py-1.5 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
                                                    >
                                                        Send Summary
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* Sent / waiting for doctor */}
                                {triageStatus === 'waiting_for_doctor' && (
                                    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-3 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
                                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                                Summary sent to {sentToDoctor}
                                            </p>
                                        </div>
                                        <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                                            Waiting for the doctor to review and approve your request…
                                        </p>
                                    </div>
                                )}

                                {/* Approved */}
                                {triageStatus === 'approved' && (
                                    <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-3 space-y-3">
                                        <p className="text-sm font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
                                            <span className="text-base">✓</span> Doctor Approved!
                                        </p>
                                        <p className="text-xs text-green-600/80 dark:text-green-400/80">
                                            {sentToDoctor} has reviewed your AI summary and is ready to see you.
                                        </p>
                                        <Button
                                            className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold"
                                            onClick={() =>
                                                router.push(
                                                    `/patient/appointments?doctorId=${selectedDoctorId}&triageId=${submittedTriageId}`
                                                )
                                            }
                                        >
                                            <CalendarCheck className="h-4 w-4" />
                                            Book Appointment Now
                                        </Button>
                                    </div>
                                )}

                                {/* Declined */}
                                {triageStatus === 'declined' && (
                                    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3 space-y-3">
                                        <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                                            Request not accepted
                                        </p>
                                        <p className="text-xs text-red-600/80 dark:text-red-400/80">
                                            The doctor was unable to take your case at this time. You can try a different specialist.
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full gap-2 border-red-200 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                                            onClick={() => {
                                                setTriageStatus('idle');
                                                setDoctors([]);
                                                setSubmittedTriageId(null);
                                                setSelectedDoctorId(null);
                                                setSentToDoctor('');
                                            }}
                                        >
                                            <RefreshCw className="h-3 w-3" />
                                            Try Another Specialist
                                        </Button>
                                    </div>
                                )}

                                {/* Find Specialist — only when idle */}
                                {triageStatus === 'idle' && (
                                    <button
                                        onClick={findSpecialist}
                                        className="w-full px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors"
                                    >
                                        Find a Specialist →
                                    </button>
                                )}

                                {(triageStatus === 'idle' || triageStatus === 'approved' || triageStatus === 'declined') && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={resetChat}
                                    >
                                        Start New Triage
                                    </Button>
                                )}
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
