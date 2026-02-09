
'use client';

import React, { useState, useEffect } from 'react';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { messagingService, Conversation } from '@/services/messaging';
import { getCurrentUser, AuthUser } from '@/lib/auth-utils';
import { Loader2, Plus, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

interface ContactUser {
    id: number;
    name: string;
    role: string;
    specialization?: string;
}

export function MessagingInterface() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // New conversation state
    const [showNewChat, setShowNewChat] = useState(false);
    const [contacts, setContacts] = useState<ContactUser[]>([]);
    const [contactSearch, setContactSearch] = useState('');
    const [loadingContacts, setLoadingContacts] = useState(false);

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

    const fetchContacts = async () => {
        setLoadingContacts(true);
        try {
            // Fetch doctors as contacts
            const doctorsRes = await api.get('/appointments/doctors/');
            const doctors = Array.isArray(doctorsRes.data) ? doctorsRes.data : (doctorsRes.data.results || []);
            const contactList: ContactUser[] = doctors.map((d: any) => ({
                id: d.user_id || d.id,
                name: d.name || `Dr. ${d.user?.first_name || ''} ${d.user?.last_name || ''}`.trim(),
                role: 'doctor',
                specialization: d.specialization || d.department_name || '',
            }));
            setContacts(contactList);
        } catch (error) {
            console.error('Failed to fetch contacts', error);
        } finally {
            setLoadingContacts(false);
        }
    };

    const handleNewConversation = async (contactId: number) => {
        try {
            const conversation = await messagingService.createConversation(contactId);
            setShowNewChat(false);
            await fetchConversations();
            setSelectedConversationId(conversation.id);
        } catch (error) {
            console.error('Failed to create conversation', error);
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
    const otherParticipant = selectedConversation?.participants.find(p => p.id !== currentUser.id);

    const filteredContacts = contacts.filter(c =>
        c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
        (c.specialization || '').toLowerCase().includes(contactSearch.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-100px)] w-full max-w-7xl mx-auto border border-border rounded-xl overflow-hidden shadow-sm bg-card">
            {/* Sidebar */}
            <div className="w-1/3 min-w-[300px] h-full flex flex-col">
                {/* New Conversation Button */}
                <div className="p-3 border-b border-border">
                    <Button
                        onClick={() => {
                            setShowNewChat(!showNewChat);
                            if (!showNewChat) fetchContacts();
                        }}
                        className="w-full font-bold"
                        variant={showNewChat ? "outline" : "default"}
                        size="sm"
                    >
                        {showNewChat ? (
                            <><X className="h-4 w-4 mr-2" /> Cancel</>
                        ) : (
                            <><Plus className="h-4 w-4 mr-2" /> New Conversation</>
                        )}
                    </Button>
                </div>

                {showNewChat ? (
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search doctors..."
                                    value={contactSearch}
                                    onChange={(e) => setContactSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        {loadingContacts ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : filteredContacts.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8 text-sm">No contacts found.</p>
                        ) : (
                            <ul className="divide-y divide-border">
                                {filteredContacts.map((contact) => (
                                    <li
                                        key={contact.id}
                                        onClick={() => handleNewConversation(contact.id)}
                                        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                {contact.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground text-sm">{contact.name}</p>
                                                <p className="text-xs text-muted-foreground">{contact.specialization || contact.role}</p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ) : (
                    <ConversationList
                        conversations={conversations}
                        currentUserId={currentUser.id}
                        selectedConversationId={selectedConversationId}
                        onSelectConversation={handleSelectConversation}
                    />
                )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 h-full bg-muted/20">
                {selectedConversationId && selectedConversation ? (
                    <ChatWindow
                        conversationId={selectedConversationId}
                        currentUserId={currentUser.id}
                        otherParticipant={otherParticipant}
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                        <div className="h-20 w-20 bg-card rounded-full shadow-sm border border-border flex items-center justify-center mb-6">
                            <span className="text-4xl">💬</span>
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">Select a Conversation</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto mb-4">
                            Choose a chat from the sidebar or start a new conversation.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowNewChat(true);
                                fetchContacts();
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" /> Start New Chat
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
