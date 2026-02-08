import api from '@/lib/api';

export interface Doctor {
    id: number;
    name: string;
    specialization: string;
    specialty: string;
    hospital: string;
    department_name: string;
    consultation_fee: number;
    experience: string;
    rating: number;
    reviews: number;
    description?: string;
    available?: boolean;
}

export interface TimeSlot {
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    isBooked: boolean;
    slotType: 'AVAILABLE' | 'UNAVAILABLE' | 'SURGERY' | 'BREAK';
}

export interface Appointment {
    id: number;
    appointment_id: string;
    patient: number;
    doctor: number;
    doctor_name: string;
    doctor_specialty: string;
    hospital: string;
    appointment_date: string;
    appointment_time: string;
    reason: string;
    status: string;
    status_display?: string;
    notes?: string;
    created_at: string;
}

export const appointmentService = {
    getDoctors: async (specialty?: string, search?: string): Promise<Doctor[]> => {
        const params = new URLSearchParams();
        if (specialty) params.append('specialty', specialty);
        if (search) params.append('search', search);

        try {
            const response = await api.get<any>(`/appointments/doctors/?${params.toString()}`);

            // Handle paginated (results) or plain array response
            const results = Array.isArray(response.data) ? response.data :
                (response.data.results ? response.data.results : []);

            // Backend DoctorSerializer returns: id, name, specialization, hospital, 
            // department_name, consultation_fee, experience, rating, reviews
            return results.map((doc: any) => ({
                id: doc.id,
                name: doc.name, // Already formatted as "Dr. First Last" by serializer
                specialization: doc.specialization,
                specialty: doc.specialization,
                hospital: doc.hospital || 'SecureMed Hospital',
                department_name: doc.department_name || '',
                consultation_fee: doc.consultation_fee || 0,
                experience: doc.experience || '5+ years',
                rating: doc.rating || 4.5,
                reviews: doc.reviews || 0,
                description: `Specialist in ${doc.specialization}`,
                available: true
            }));
        } catch (error) {
            console.error('Error fetching doctors:', error);
            throw error;
        }
    },

    getDoctorAvailability: async (doctorId: number | string, date: string): Promise<TimeSlot[]> => {
        try {
            // Use the correct endpoint as per urls.py
            const response = await api.get(`/appointments/doctors/${doctorId}/availability/?date=${date}`);

            // Backend returns { doctor_id, doctor_name, date, slots: [{time, available}] }
            const slots = response.data?.slots || response.data || [];

            return slots.map((slot: any) => {
                const time = slot.time || '09:00';
                const [hours, minutes] = time.split(':').map(Number);
                const endHours = minutes >= 30 ? hours + 1 : hours;
                const endMinutes = minutes >= 30 ? '00' : '30';

                return {
                    startTime: `${time}:00`,
                    endTime: `${String(endHours).padStart(2, '0')}:${endMinutes}:00`,
                    isAvailable: slot.available,
                    isBooked: !slot.available,
                    slotType: slot.available ? 'AVAILABLE' : 'UNAVAILABLE'
                };
            });
        } catch (error) {
            console.error('Error fetching availability:', error);
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
        return {
            success: true,
            confirmationNumber: response.data.appointment_id,
            ...response.data
        };
    },

    getAppointments: async (): Promise<Appointment[]> => {
        try {
            const response = await api.get('/appointments/appointments/');
            const results = Array.isArray(response.data) ? response.data :
                (response.data.results ? response.data.results : []);

            return results.map((appt: any) => ({
                id: appt.id,
                appointment_id: appt.appointment_id,
                patient: appt.patient,
                doctor: appt.doctor,
                doctor_name: appt.doctor_name || 'Unknown Doctor',
                doctor_specialty: appt.doctor_specialty || 'General',
                hospital: appt.hospital || 'SecureMed Hospital',
                appointment_date: appt.appointment_date,
                appointment_time: appt.appointment_time,
                reason: appt.reason,
                status: appt.status,
                status_display: appt.status_display,
                notes: appt.notes,
                created_at: appt.created_at
            }));
        } catch (error) {
            console.error('Error fetching appointments:', error);
            return [];
        }
    }
};

export const medicalRecordService = {
    getMedicalRecords: async (): Promise<any[]> => {
        try {
            const token = localStorage.getItem('auth_tokens') ? JSON.parse(localStorage.getItem('auth_tokens')!).access : null;
            if (!token) return [];

            const response = await api.get('/medical_records/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching medical records:', error);
            return [];
        }
    },

    uploadRecord: async (formData: FormData): Promise<any> => {
        const token = localStorage.getItem('auth_tokens') ? JSON.parse(localStorage.getItem('auth_tokens')!).access : null;
        if (!token) throw new Error("No auth token");

        const response = await api.post('/medical_records/', formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    getPrescriptions: async (): Promise<any[]> => {
        try {
            const token = localStorage.getItem('auth_tokens') ? JSON.parse(localStorage.getItem('auth_tokens')!).access : null;
            if (!token) return [];

            const response = await api.get('/medical_records/prescriptions/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Handle pagination if present
            return Array.isArray(response.data) ? response.data :
                (response.data.results ? response.data.results : []);
        } catch (error) {
            console.error('Error fetching prescriptions:', error);
            return [];
        }
    }
};
