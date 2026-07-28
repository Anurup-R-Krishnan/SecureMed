import { apiClient } from '@/lib/unified-api-client';

export interface VideoRoom {
    id: number;
    room_id: string;
    doctor: number;
    patient: number;
    status: 'waiting' | 'active' | 'ended';
    created_at: string;
    started_at?: string;
    ended_at?: string;
}

export const videoService = {
    // Create a room (Doctor only)
    createRoom: async (patientId: number): Promise<VideoRoom> => {
        return await apiClient.post('/telemedicine/rooms/', { patient: patientId });
    },

    // Get active room for an appointment/patient
    getActiveRoom: async (patientId: number): Promise<VideoRoom | null> => {
        // This endpoint requires a bit of filtering on the backend or we filter here
        // For now, let's list rooms and find one
        const response = await apiClient.get<any>('/telemedicine/rooms/');
        // Find active room with this patient
        const rooms = response.results || response;
        return rooms.find((r: any) => r.patient === patientId && r.status !== 'ended') || null;
    },

    // Join room (Patient/Doctor)
    joinRoom: async (roomId: string): Promise<any> => {
        return await apiClient.post(`/telemedicine/rooms/${roomId}/join/`);
    },

    // Poll room status (Patient/Doctor)
    checkRoomStatus: async (roomId: string): Promise<{ status: string; waiting_count?: number }> => {
        return await apiClient.get(`/telemedicine/rooms/${roomId}/status_check/`);
    },

    // Start call (Doctor)
    startCall: async (roomId: string): Promise<any> => {
        return await apiClient.post(`/telemedicine/rooms/${roomId}/start/`);
    },

    // Admit patient from waiting room (Doctor)
    admitPatient: async (roomId: string): Promise<any> => {
        return await apiClient.post(`/telemedicine/rooms/${roomId}/admit/`);
    },

    // End call
    endCall: async (roomId: string): Promise<any> => {
        return await apiClient.post(`/telemedicine/rooms/${roomId}/end/`);
    }
};
