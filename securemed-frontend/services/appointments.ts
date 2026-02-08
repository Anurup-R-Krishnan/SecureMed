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
    // available: string[]; // To be implemented in backend completely
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
    getDoctors: async (specialty?: string, search?: string) => {
        const params = new URLSearchParams();
        if (specialty) params.append('specialty', specialty);
        if (search) params.append('search', search);

        const response = await api.get<Doctor[]>(`/appointments/doctors/?${params.toString()}`);
        return response.data;
    },

    getAppointments: async () => {
        const response = await api.get<Appointment[]>('/appointments/appointments/');
        return response.data;
    },

    createAppointment: async (data: {
        doctor: number;
        appointment_date: string; // YYYY-MM-DD
        appointment_time: string; // HH:MM
        reason: string;
    }) => {
        const response = await api.post('/appointments/appointments/', data);
        return response.data;
    },
};

export const medicalRecordService = {
    getMedicalRecords: async () => {
        const response = await api.get('/medical-records/records/');
        return response.data;
    }
}
