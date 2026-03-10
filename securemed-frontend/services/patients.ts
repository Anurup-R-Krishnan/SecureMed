import api from '@/lib/api';

export interface TimelineEvent {
    id: string;
    date: string;
    title: string;
    description: string;
    category: 'appointment' | 'medication' | 'lab' | 'diagnosis' | 'admin' | 'billing';
    type?: string;
    details?: Record<string, any>;
    doctor?: string;
    location?: string;
    status?: 'completed' | 'upcoming' | 'pending' | 'cancelled';
}

export const patientService = {
    getPatients: async (): Promise<any[]> => {
        try {
            const response = await api.get('/patients/');
            if (Array.isArray(response.data)) return response.data;
            return response.data?.results || [];
        } catch (error) {
            console.error('Error fetching patients:', error);
            return [];
        }
    },

    getPatientTimeline: async (patientId?: string): Promise<TimelineEvent[]> => {
        const params = patientId ? { patient_id: patientId } : {};
        const categoryMap: Record<string, TimelineEvent['category']> = {
            diagnostic: 'lab',
            treatment: 'medication',
            financial: 'billing',
            consultation: 'appointment',
            administrative: 'admin'
        };

        const normalize = (payload: any) => {
            const data = Array.isArray(payload)
                ? payload
                : (Array.isArray(payload?.timeline) ? payload.timeline : (payload?.results || []));
            return data.map((event: any) => ({
                ...event,
                category: categoryMap[event.category] || event.category || 'admin'
            }));
        };

        try {
            const response = await api.get('/medical-records/timeline/', { params });
            return normalize(response.data);
        } catch (error: any) {
            try {
                const response = await api.get('/patients/timeline/', { params });
                return normalize(response.data);
            } catch (fallbackError) {
                console.error('Error fetching patient timeline:', fallbackError);
                return [];
            }
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
    },

    getPatientOverview: async (patientId: string) => {
        try {
            const response = await api.get(`/medical-records/dashboard/stats/?patient_id=${patientId}`);
            return response.data;
        } catch (error) {
            return null;
        }
    },

    getActiveMedications: async () => {
        try {
            // Fetch from pharmacy orders or a dedicated endpoint if available.
            // Falling back to dashboard stats of the current user (as a doctor viewing broad context) 
            // is not ideal. Instead, we'll try to hit the pharmacy-orders endpoint to get *all* fulfilled orders.
            const response = await api.get('/medical-records/pharmacy-orders/');
            return response.data;
        } catch (error) {
            console.error('Error fetching medications:', error);
            return [];
        }
    }
};
