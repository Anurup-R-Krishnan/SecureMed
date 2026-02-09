
import React from 'react';
import { Conversation, User } from '@/services/messaging';
import { cn } from '@/lib/utils';
import { User as UserIcon, Calendar, MessageSquare } from 'lucide-react';

interface ConversationListProps {
    conversations: Conversation[];
    currentUserId: number;
    selectedConversationId: number | null;
    onSelectConversation: (id: number) => void;
}

export function ConversationList({
    conversations,
    currentUserId,
    selectedConversationId,
    onSelectConversation
}: ConversationListProps) {

    const getOtherParticipant = (conversation: Conversation) => {
        return conversation.participants.find(p => p.id !== currentUserId) || conversation.participants[0];
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    return (
        <div className="flex flex-col h-full border-r border-gray-200 bg-white">
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                        No conversations yet.
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {conversations.map((conversation) => {
                            const otherParticipant = getOtherParticipant(conversation);
                            const isSelected = selectedConversationId === conversation.id;

                            return (
                                <li
                                    key={conversation.id}
                                    onClick={() => onSelectConversation(conversation.id)}
                                    className={cn(
                                        "p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200",
                                        isSelected ? "bg-blue-50 border-l-4 border-blue-500" : "border-l-4 border-transparent"
                                    )}
                                >
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                <UserIcon size={20} />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline">
                                                <h3 className="text-sm font-medium text-gray-900 truncate">
                                                    {otherParticipant?.name || otherParticipant?.username || 'Unknown User'}
                                                </h3>
                                                <span className="text-xs text-gray-400 flex-shrink-0">
                                                    {conversation.last_message ? formatDate(conversation.last_message.created_at) : formatDate(conversation.updated_at)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 truncate">
                                                {conversation.last_message ? conversation.last_message.content : 'Start a conversation'}
                                            </p>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
