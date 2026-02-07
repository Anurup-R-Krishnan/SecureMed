import api from '@/lib/api';

export interface Doctor {
    id: number;
    name: string;
    specialization: string;
    hospital: string;
    department_name: string;
    consultation_fee: number;
    experience: string;
    rating: number;
    reviews: number;
}

export interface Appointment {
    id: number;
    appointment_id: string;
    doctor_name: string;
    doctor_specialty: string;
    hospital: string;
    appointment_date: string;
    appointment_time: string;
    reason: string;
    status: string;
    status_display: string;
}

export const appointmentService = {
    getDoctors: async (specialty?: string, search?: string): Promise<Doctor[]> => {
        try {
            const params = new URLSearchParams();
            if (specialty) params.append('specialty', specialty);
            if (search) params.append('search', search);

            const response = await api.get<Doctor[]>(`/appointments/doctors/?${params.toString()}`);
            // Ensure we always return an array
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.error('Error fetching doctors:', error);
            return []; // Return empty array on error instead of throwing
        }
    },

    getAppointments: async (): Promise<Appointment[]> => {
        try {
            const response = await api.get<Appointment[]>('/appointments/appointments/');
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.error('Error fetching appointments:', error);
            return [];
        }
    },

    createAppointment: async (data: {
        doctor: number;
        appointment_date: string;
        appointment_time: string;
        reason: string;
    }) => {
        const response = await api.post('/appointments/appointments/', data);
        return response.data;
    },
};

export const medicalRecordService = {
    getMedicalRecords: async () => {
        try {
            const response = await api.get('/medical-records/records/');
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.error('Error fetching medical records:', error);
            return [];
        }
    }
}
