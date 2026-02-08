import api from '@/lib/api';

export interface Referral {
    id: number;
    referral_id: string;
    patient: number;
    patient_name: string;
    patient_display_id: string;
    referring_doctor: number;
    referring_doctor_name: string;
    specialist: number;
    specialist_name: string;
    department?: number;
    department_name?: string;
    status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
    status_display: string;
    priority: 'routine' | 'urgent' | 'emergency';
    priority_display: string;
    reason: string;
    clinical_notes?: string;
    access_granted: boolean;
    access_expires_at?: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;
}

export interface ReferredPatient {
    id: number;
    patient_id: string;
    name: string;
    referral_id: string;
    referred_by: string;
    reason: string;
    priority: string;
    access_expires_at: string;
    created_at: string;
}

export interface CreateReferralData {
    patient: number;
    specialist: number;
    department?: number;
    priority: 'routine' | 'urgent' | 'emergency';
    reason: string;
    clinical_notes?: string;
}

export const referralService = {
    /**
     * Get all referrals (made by or received by current doctor)
     */
    getReferrals: async (): Promise<Referral[]> => {
        const response = await api.get('/appointments/referrals/');
        return Array.isArray(response.data) ? response.data : response.data.results || [];
    },

    /**
     * Create a new referral
     */
    createReferral: async (data: CreateReferralData): Promise<Referral> => {
        const response = await api.post('/appointments/referrals/', data);
        return response.data;
    },

    /**
     * Get patients referred to current doctor (My Patients list)
     */
    getMyPatients: async (): Promise<ReferredPatient[]> => {
        const response = await api.get('/appointments/referrals/my_patients/');
        return response.data;
    },

    /**
     * Accept a pending referral
     */
    acceptReferral: async (referralId: number): Promise<Referral> => {
        const response = await api.post(`/appointments/referrals/${referralId}/accept/`);
        return response.data;
    },

    /**
     * Decline a referral
     */
    declineReferral: async (referralId: number): Promise<Referral> => {
        const response = await api.post(`/appointments/referrals/${referralId}/decline/`);
        return response.data;
    },

    /**
     * Complete a referral and revoke access
     */
    completeReferral: async (referralId: number): Promise<Referral> => {
        const response = await api.post(`/appointments/referrals/${referralId}/complete/`);
        return response.data;
    },

    /**
     * Extend access period for a referral
     */
    extendAccess: async (referralId: number, days: number = 30): Promise<Referral> => {
        const response = await api.post(`/appointments/referrals/${referralId}/extend_access/`, { days });
        return response.data;
    },
};

export default referralService;
