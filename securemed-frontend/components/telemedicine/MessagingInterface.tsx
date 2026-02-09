
'use client';

import React, { useState, useEffect } from 'react';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { messagingService, Conversation } from '@/services/messaging';
import { getCurrentUser, AuthUser } from '@/lib/auth-utils';
import { Loader2 } from 'lucide-react';

export function MessagingInterface() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const user = getCurrentUser();
        setCurrentUser(user);
        if (user) {
            fetchConversations();
        }
    }, []);

    const fetchConversations = async () => {
        setIsLoading(true);
        try {
            const data = await messagingService.getConversations();
            setConversations(data);
        } catch (error) {
            console.error('Failed to load conversations', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectConversation = (id: number) => {
        setSelectedConversationId(id);
    };

    if (!currentUser) {
        return <div className="p-8 text-center">Please log in to view messages.</div>;
    }

    if (isLoading && conversations.length === 0) {
        return (
            <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const selectedConversation = conversations.find(c => c.id === selectedConversationId);

    // Determine the other participant for the chat window title
    const otherParticipant = selectedConversation?.participants.find(p => p.id !== currentUser.id);

    return (
        <div className="flex h-[calc(100vh-100px)] w-full max-w-7xl mx-auto border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="w-1/3 min-w-[300px] h-full">
                <ConversationList
                    conversations={conversations}
                    currentUserId={currentUser.id}
                    selectedConversationId={selectedConversationId}
                    onSelectConversation={handleSelectConversation}
                />
            </div>
            <div className="flex-1 h-full bg-gray-50">
                {selectedConversationId && selectedConversation ? (
                    <ChatWindow
                        conversationId={selectedConversationId}
                        currentUserId={currentUser.id}
                        otherParticipant={otherParticipant}
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center bg-gray-50/50 p-8 text-center animate-in fade-in duration-500">
                        <div className="h-20 w-20 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center mb-6">
                            <span className="text-4xl">💬</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Conversation</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-8">
                            Choose a chat from the sidebar to view history or start a new message.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
