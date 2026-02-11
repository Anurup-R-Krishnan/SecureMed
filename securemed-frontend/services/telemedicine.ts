import api from '@/lib/api';

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
        const response = await api.post('/telemedicine/rooms/', { patient: patientId });
        return response.data;
    },

    // Get active room for an appointment/patient
    getActiveRoom: async (patientId: number): Promise<VideoRoom | null> => {
        // This endpoint requires a bit of filtering on the backend or we filter here
        // For now, let's list rooms and find one
        const response = await api.get('/telemedicine/rooms/');
        // Find active room with this patient
        const rooms = response.data.results || response.data;
        return rooms.find((r: any) => r.patient === patientId && r.status !== 'ended') || null;
    },

    // Join room (Patient/Doctor)
    joinRoom: async (roomId: string): Promise<any> => {
        const response = await api.post(`/telemedicine/rooms/${roomId}/join/`);
        return response.data;
    },

    // Start call (Doctor)
    startCall: async (roomId: string): Promise<any> => {
        const response = await api.post(`/telemedicine/rooms/${roomId}/start/`);
        return response.data;
    },

    // End call
    endCall: async (roomId: string): Promise<any> => {
        const response = await api.post(`/telemedicine/rooms/${roomId}/end/`);
        return response.data;
    }
};
