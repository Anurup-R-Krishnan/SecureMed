
import React, { useState, useEffect, useRef } from 'react';
import { Message, User, messagingService } from '@/services/messaging';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Paperclip, File } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
    conversationId: number;
    currentUserId: number;
    otherParticipant: User | undefined;
}

export function ChatWindow({ conversationId, currentUserId, otherParticipant }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchMessages = React.useCallback(async () => {
        try {
            const data = await messagingService.getMessages(conversationId);
            setMessages(data);
        } catch (error) {
            console.error('Failed to load messages', error);
        }
    }, [conversationId]);

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
        if (!newMessage.trim()) return;

        try {
            setIsLoading(true);
            const sentMessage = await messagingService.sendMessage(conversationId, newMessage);
            setMessages([...messages, sentMessage]);
            setNewMessage('');
        } catch (error) {
            console.error('Failed to send message', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        {otherParticipant?.name || otherParticipant?.username || 'Chat'}
                    </h3>
                    <p className="text-xs text-green-600 font-medium">Active Now</p>
                </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.map((msg) => {
                        const isMe = msg.sender === currentUserId;
                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex w-full mb-4",
                                    isMe ? "justify-end" : "justify-start"
                                )}
                            >
                                <div
                                    className={cn(
                                        "max-w-[70%] rounded-2xl px-4 py-2 shadow-sm",
                                        isMe
                                            ? "bg-blue-600 text-white rounded-br-none"
                                            : "bg-white text-gray-900 border border-gray-100 rounded-bl-none"
                                    )}
                                >
                                    <p className="text-sm">{msg.content}</p>
                                    {msg.attachment && (
                                        <div className="mt-2 text-xs flex items-center gap-1 opacity-80 cursor-pointer hover:underline">
                                            <File size={12} /> Attachment
                                        </div>
                                    )}
                                    <span
                                        className={cn(
                                            "text-[10px] mt-1 block w-full text-right",
                                            isMe ? "text-blue-100" : "text-gray-400"
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

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                    <Button type="button" variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                        <Paperclip size={20} />
                    </Button>
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 focus-visible:ring-blue-500"
                        disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading || !newMessage.trim()} className="bg-blue-600 hover:bg-blue-700">
                        <Send size={18} />
                    </Button>
                </form>
            </div>
        </div>
    );
}
