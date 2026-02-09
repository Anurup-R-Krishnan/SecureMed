import api from '@/lib/api';
import { getAccessToken } from '@/lib/auth-utils';

export interface Doctor {
    id: number;
    user_id: number;
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

export interface DoctorAvailabilitySlot {
    id?: string | number;
    startTime: string;
    endTime: string;
    type: 'available' | 'surgery' | 'break';
}

export interface Appointment {
    id: number;
    appointment_id: string;
    patient: number;
    patient_name?: string;
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

            return results.map((doc: any) => ({
                id: doc.id,
                user_id: doc.user_id,
                name: doc.name,
                specialization: doc.specialization,
                specialty: doc.specialization,
                hospital: doc.hospital,
                department_name: doc.department_name,
                consultation_fee: doc.consultation_fee,
                experience: doc.experience,
                rating: doc.rating,
                reviews: doc.reviews,
                description: doc.description || `Specialist in ${doc.specialization}`,
                available: doc.available
            }));
        } catch (error) {
            console.error('Error fetching doctors:', error);
            throw error;
        }
    },

    getDoctorAvailability: async (doctorId: number | string, date: string): Promise<TimeSlot[]> => {
        try {
            const response = await api.get(`/appointments/doctors/${doctorId}/availability/?date=${date}`);
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
            const token = getAccessToken();
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

            const response = await api.get('/appointments/appointments/', config);
            const results = Array.isArray(response.data) ? response.data :
                (response.data.results ? response.data.results : []);

            return results.map((appt: any) => ({
                id: appt.id,
                appointment_id: appt.appointment_id,
                patient: appt.patient,
                patient_name: appt.patient_name,
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
            throw error;
        }
    },

    updateAppointmentStatus: async (appointmentId: number, status: string): Promise<any> => {
        try {
            const response = await api.patch(`/appointments/appointments/${appointmentId}/`, { status });
            return response.data;
        } catch (error) {
            console.error('Error updating appointment status:', error);
            throw error;
        }
    },

    getDoctorSchedule: async (date: string): Promise<DoctorAvailabilitySlot[]> => {
        try {
            const token = getAccessToken();
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

            const response = await api.get(`/appointments/doctor/availability/?date=${date}`, config);
            const slots = response.data?.slots || [];
            return slots.map((slot: any) => ({
                id: slot.id,
                startTime: slot.startTime,
                endTime: slot.endTime,
                type: slot.type
            }));
        } catch (error) {
            console.error('Error fetching doctor schedule:', error);
            return [];
        }
    },

    saveDoctorSchedule: async (date: string, slots: DoctorAvailabilitySlot[]) => {
        const token = getAccessToken();
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

        const response = await api.post('/appointments/doctor/availability/', {
            date,
            slots
        }, config);
        return response.data;
    }
};

export const medicalRecordService = {
    getMedicalRecords: async (): Promise<any[]> => {
        try {
            const token = getAccessToken();
            if (!token) return [];

            const response = await api.get('/medical-records/records/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            return Array.isArray(response.data) ? response.data :
                (response.data.results ? response.data.results : []);
        } catch (error) {
            console.error('Error fetching medical records:', error);
            return [];
        }
    },

    uploadRecord: async (formData: FormData): Promise<any> => {
        const token = getAccessToken();
        if (!token) throw new Error("No auth token");

        const response = await api.post('/medical-records/', formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    getPrescriptions: async (): Promise<any[]> => {
        try {
            const token = getAccessToken();
            if (!token) return [];

            const response = await api.get('/medical-records/prescriptions/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            return Array.isArray(response.data) ? response.data :
                (response.data.results ? response.data.results : []);
        } catch (error) {
            console.error('Error fetching prescriptions:', error);
            return [];
        }
    }
};
