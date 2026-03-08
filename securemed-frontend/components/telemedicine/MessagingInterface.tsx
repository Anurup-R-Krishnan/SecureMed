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
        return <div className="p-8 text-center text-muted-foreground">Please log in to view messages.</div>;
    }

    if (isLoading && conversations.length === 0) {
        return (
            <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const selectedConversation = conversations.find(c => c.id === selectedConversationId);

    return (
        <div className="h-[calc(100vh-110px)] bg-card border border-border/60 rounded-[24px] shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Conversation List (Master View) */}
            <div className={`col-span-1 md:col-span-4 lg:col-span-3 border-r border-border/60 bg-muted/10 flex flex-col h-full ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
                {/* Search Header */}
                <div className="p-4 border-b border-border/60">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold tracking-tight">Messages</h2>
                        <Button
                            onClick={() => {
                                setShowNewChat(!showNewChat);
                                if (!showNewChat) fetchContacts();
                            }}
                            size="icon"
                            variant="ghost"
                            className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>
                    {/* Search Bar - Minimal Style */}
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search messages..."
                            className="pl-9 h-10 rounded-xl bg-background border-border/50 focus:border-primary/50 focus:ring-primary/10 transition-all font-medium"
                        />
                    </div>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                    {/* New Chat Selection View */}
                    {showNewChat ? (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="flex items-center justify-between mb-2 px-2">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">New Chat</h3>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full" onClick={() => setShowNewChat(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Contact Search */}
                            <div className="mb-3 px-2">
                                <Input
                                    placeholder="Find a doctor..."
                                    value={contactSearch}
                                    onChange={(e) => setContactSearch(e.target.value)}
                                    className="h-9 text-sm rounded-lg bg-background"
                                    autoFocus
                                />
                            </div>

                            {/* Contact List */}
                            <div className="space-y-1">
                                {loadingContacts ? (
                                    <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                                ) : contacts.length > 0 ? (
                                    contacts
                                        .filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()))
                                        .map(contact => (
                                            <button
                                                key={contact.id}
                                                onClick={() => handleNewConversation(contact.id)}
                                                className="w-full text-left p-3 rounded-xl hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/10 group"
                                            >
                                                <div className="font-bold text-sm group-hover:text-primary transition-colors">{contact.name}</div>
                                                <div className="text-xs text-muted-foreground">{contact.specialization || contact.role}</div>
                                            </button>
                                        ))
                                ) : (
                                    <div className="text-center p-4 text-xs text-muted-foreground">No contacts found</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Conversation List Component */
                        <ConversationList
                            conversations={conversations}
                            selectedConversationId={selectedConversationId}
                            onSelectConversation={handleSelectConversation}
                            currentUserId={currentUser.id}
                        />
                    )}
                </div>
            </div>

            {/* Chat Window (Detail View) */}
            <div className={`col-span-1 md:col-span-8 lg:col-span-9 bg-background h-full flex flex-col ${!selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
                {selectedConversation ? (
                    <ChatWindow
                        conversation={selectedConversation}
                        currentUserId={currentUser.id}
                        onBack={() => setSelectedConversationId(null)}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 animate-in fade-in duration-500">
                        <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
                            {/* <MessageSquare className="h-8 w-8 text-muted-foreground/50" /> */}
                            <span className="text-4xl">💬</span>
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">Select a Conversation</h3>
                        <p className="max-w-xs text-center text-sm">
                            Choose a conversation from the list or start a new chat to begin messaging.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
