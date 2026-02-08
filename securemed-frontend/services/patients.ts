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
            const response = await api.get('/patients/profile/');
            const data = response.data;
            return {
                provider: data.insurance_provider || 'Not provided',
                policyNumber: data.insurance_number || 'N/A',
                groupNumber: 'N/A', // Field not on Patient model
                expiryDate: 'N/A'   // Field not on Patient model
            };
        } catch (error) {
            console.error('Error fetching insurance info:', error);
            return null;
        }
    }
};
