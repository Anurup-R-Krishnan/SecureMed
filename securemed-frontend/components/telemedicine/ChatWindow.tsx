import React, { useState, useEffect, useRef } from 'react';
import { Message, User, messagingService } from '@/services/messaging';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Paperclip, File, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
    conversation: any; // Using any for flexibility with conversation object structure differences
    conversationId?: number; // Optional fallback
    currentUserId: number;
    otherParticipant?: User; // Optional fallback
    onBack: () => void;
}

export function ChatWindow({ conversation, conversationId, currentUserId, otherParticipant, onBack }: ChatWindowProps) {
    // Resolve conversation details handles both prop structures
    const activeConversationId = conversation?.id || conversationId;
    const activeOtherParticipant = otherParticipant || (conversation?.participants?.find((p: any) => p.id !== currentUserId));

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

    const fetchMessages = React.useCallback(async () => {
        if (!activeConversationId) return;
        try {
            const data = await messagingService.getMessages(activeConversationId);
            setMessages(data);
        } catch (error) {
            console.error('Failed to load messages', error);
        }
    }, [activeConversationId]);

    useEffect(() => {
        fetchMessages();
        // Poll for new messages every 5 seconds
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeConversationId) return;
        if (!newMessage.trim() && !attachmentFile) return;

        try {
            setIsLoading(true);
            const content = newMessage.trim() || (attachmentFile ? 'Attachment' : '');
            const sentMessage = await messagingService.sendMessage(activeConversationId, content, attachmentFile || undefined);
            setMessages([...messages, sentMessage]);
            setNewMessage('');
            setAttachmentFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Failed to send message', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background relative">
            {/* Header - Transparent Style */}
            <div className="p-4 border-b border-border/60 bg-background/80 backdrop-blur-md flex justify-between items-center z-10 sticky top-0">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={onBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {(activeOtherParticipant?.name?.[0] || activeOtherParticipant?.username?.[0] || 'U').toUpperCase()}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground tracking-tight">
                            {activeOtherParticipant?.name || activeOtherParticipant?.username || 'Chat'}
                        </h3>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Active Now</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Area - Clean & Spacious */}
            <ScrollArea className="flex-1 p-4 sm:p-6">
                <div className="space-y-6 pb-4">
                    {messages.map((msg) => {
                        const isMe = msg.sender === currentUserId;
                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                                    isMe ? "justify-end" : "justify-start"
                                )}
                            >
                                <div
                                    className={cn(
                                        "max-w-[75%] px-5 py-3 shadow-sm relative",
                                        isMe
                                            ? "bg-primary text-primary-foreground rounded-[20px] rounded-tr-sm"
                                            : "bg-muted/50 text-foreground border border-border/50 rounded-[20px] rounded-tl-sm"
                                    )}
                                >
                                    <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
                                    {msg.attachment && (
                                        <button
                                            type="button"
                                            className="mt-3 p-2 bg-black/10 rounded-lg text-xs flex items-center gap-2 cursor-pointer hover:bg-black/20 transition-colors w-full text-left"
                                            onClick={() => window.open(msg.attachment as string, '_blank', 'noopener,noreferrer')}
                                        >
                                            <File size={14} />
                                            <span className="font-bold underline">Attachment</span>
                                        </button>
                                    )}
                                    <span
                                        className={cn(
                                            "text-[9px] mt-1.5 block w-full text-right font-bold opacity-70 uppercase tracking-wider",
                                            isMe ? "text-primary-foreground/80" : "text-muted-foreground"
                                        )}
                                    >
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            {/* Input Area - Floating Capsule */}
            <div className="p-4 sm:p-6 bg-background border-t border-border/40">
                <form onSubmit={handleSendMessage} className="flex gap-3 items-center bg-muted/30 p-1.5 pr-2 rounded-full border border-border/60 hover:border-primary/30 transition-colors focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5">
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setAttachmentFile(file);
                        }}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary rounded-full h-10 w-10 shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Paperclip size={20} />
                    </Button>
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={attachmentFile ? `Attachment: ${attachmentFile.name}` : "Type your message..."}
                        className="flex-1 bg-transparent border-none focus-visible:ring-0 px-2 h-9 font-medium placeholder:text-muted-foreground/50"
                        disabled={isLoading}
                    />
                    <Button
                        type="submit"
                        disabled={isLoading || !newMessage.trim()}
                        className="rounded-full h-10 w-10 p-0 shadow-lg shadow-primary/20 hover:scale-105 transition-all shrink-0 bg-primary text-primary-foreground"
                    >
                        <Send size={18} className={isLoading ? "animate-pulse" : "ml-0.5"} />
                    </Button>
                </form>
            </div>
        </div>
    );
}
