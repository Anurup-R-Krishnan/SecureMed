
import api from '@/lib/api';

export interface User {
    id: number;
    username: string;
    name: string;
    role: string;
}

export interface Attachment {
    url: string;
    name: string;
}

export interface Message {
    id: number;
    conversation: number;
    sender: number;
    sender_name: string;
    content: string;
    attachment: string | null; // URL or null
    is_read: boolean;
    created_at: string;
}

export interface Conversation {
    id: number;
    participants: {
        id: number;
        username: string;
        name: string;
        role: string;
    }[];
    created_at: string;
    updated_at: string;
    is_active: boolean;
    last_message: Message | null;
}

export const messagingService = {
    getConversations: async (): Promise<Conversation[]> => {
        try {
            const response = await api.get('/telemedicine/conversations/');
            return Array.isArray(response.data) ? response.data :
                (response.data.results ? response.data.results : []);
        } catch (error) {
            console.error('Error fetching conversations:', error);
            return [];
        }
    },

    createConversation: async (participantId: number): Promise<Conversation> => {
        const response = await api.post('/telemedicine/conversations/', {
            participant_id: participantId
        });
        return response.data;
    },

    getMessages: async (conversationId: number): Promise<Message[]> => {
        try {
            const response = await api.get(`/telemedicine/messages/?conversation=${conversationId}`);
            return Array.isArray(response.data) ? response.data :
                (response.data.results ? response.data.results : []);
        } catch (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
    },

    sendMessage: async (conversationId: number, content: string, attachment?: File): Promise<Message> => {
        const formData = new FormData();
        formData.append('conversation', conversationId.toString());
        formData.append('content', content);
        if (attachment) {
            formData.append('attachment', attachment);
        }

        const response = await api.post('/telemedicine/messages/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
};
