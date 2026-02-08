import api from '@/lib/api';

export interface TimelineEvent {
    id: string;
    date: string;
    title: string;
    description: string;
    category: 'appointment' | 'medication' | 'lab' | 'diagnosis' | 'admin';
    doctor?: string;
    location?: string;
    status?: 'completed' | 'upcoming' | 'pending' | 'cancelled';
}

export const patientService = {
    getPatientTimeline: async (patientId?: string): Promise<TimelineEvent[]> => {
        try {
            const params = patientId ? { patient_id: patientId } : {};
            const response = await api.get('/patients/timeline/', { params });

            // Map backend response to ensure frontend compatibility
            return response.data;
        } catch (error) {
            console.error('Error fetching patient timeline:', error);
            return [];
        }
    },

    getInsuranceInfo: async () => {
        try {
            // TODO: Replace with actual backend API call when endpoint is available
            // For now, return placeholder data
            return {
                provider: 'Insurance data not available',
                policyNumber: 'N/A',
                groupNumber: 'N/A',
                expiryDate: 'N/A'
            };
        } catch (error) {
            return null;
        }
    }
};
