import { apiClient } from '@/lib/unified-api-client';
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
            const response = await apiClient.get<any>(`/appointments/doctors/?${params.toString()}`);

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
            throw error;
        }
    },

    getDoctorAvailability: async (doctorId: number | string, date: string): Promise<TimeSlot[]> => {
        try {
            const response = await apiClient.get(`/appointments/doctors/${doctorId}/availability/?date=${date}`);
            const slots = response.data?.slots || response.data || [];

            return slots.map((slot: any) => {
                const time = slot.time || '09:00';
                const [hours, minutes] = time.split(':').map(Number);
                const endHours = minutes >= 30 ? hours + 1 : hours;
                const endMinutes = minutes >= 30 ? '00' : '30';

                const slotTypeRaw = (slot.slot_type || '').toString().toLowerCase();
                const slotType: TimeSlot['slotType'] =
                    slotTypeRaw === 'surgery' ? 'SURGERY' :
                        slotTypeRaw === 'break' ? 'BREAK' :
                            slotTypeRaw === 'available' ? 'AVAILABLE' :
                                'UNAVAILABLE';

                const isBooked = Boolean(slot.is_booked ?? (!slot.available && slotType === 'AVAILABLE'));
                const isAvailable = Boolean(slot.available ?? (slotType === 'AVAILABLE' && !isBooked));

                return {
                    startTime: `${time}:00`,
                    endTime: `${String(endHours).padStart(2, '0')}:${endMinutes}:00`,
                    isAvailable,
                    isBooked,
                    slotType
                };
            });
        } catch (error) {
            return [];
        }
    },

    createAppointment: async (data: {
        doctor: number;
        appointment_date: string;
        appointment_time: string;
        reason: string;
    }) => {
        const response = await apiClient.post('/appointments/appointments/', data);
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

            const response = await apiClient.get('/appointments/appointments/', config);
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
            throw error;
        }
    },

    updateAppointmentStatus: async (appointmentId: number, status: string): Promise<any> => {
        try {
            const response = await apiClient.patch(`/appointments/appointments/${appointmentId}/`, { status });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    acceptAppointment: async (appointmentId: number): Promise<Appointment> => {
        const response = await apiClient.post(`/appointments/appointments/${appointmentId}/accept/`);
        return response.data;
    },

    startConsultation: async (appointmentId: number): Promise<Appointment> => {
        const response = await apiClient.post(`/appointments/appointments/${appointmentId}/start_consultation/`);
        return response.data;
    },

    completeConsultation: async (appointmentId: number, notes?: string): Promise<Appointment> => {
        const response = await apiClient.post(`/appointments/appointments/${appointmentId}/complete_consultation/`, { notes });
        return response.data;
    },

    cancelAppointment: async (appointmentId: number, reason?: string): Promise<Appointment> => {
        const response = await apiClient.post(`/appointments/appointments/${appointmentId}/cancel/`, { reason });
        return response.data;
    },

    getDoctorSchedule: async (date: string): Promise<DoctorAvailabilitySlot[]> => {
        try {
            const token = getAccessToken();
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

            const response = await apiClient.get(`/appointments/doctor/availability/?date=${date}`, config);
            const slots = response.data?.slots || [];
            return slots.map((slot: any) => ({
                id: slot.id,
                startTime: slot.startTime,
                endTime: slot.endTime,
                type: slot.type
            }));
        } catch (error) {
            return [];
        }
    },

    saveDoctorSchedule: async (date: string, slots: DoctorAvailabilitySlot[]) => {
        const token = getAccessToken();
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

        const response = await apiClient.post('/appointments/doctor/availability/', {
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

            const response = await apiClient.get('/medical-records/records/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            return Array.isArray(response.data) ? response.data :
                (response.data.results ? response.data.results : []);
        } catch (error) {
            return [];
        }
    },

    uploadRecord: async (formData: FormData): Promise<any> => {
        const token = getAccessToken();
        if (!token) throw new Error("No auth token");

        const response = await apiClient.post('/medical-records/records/patient-upload/', formData, {
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

            const response = await apiClient.get('/medical-records/prescriptions/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            return Array.isArray(response.data) ? response.data :
                (response.data.results ? response.data.results : []);
        } catch (error) {
            return [];
        }
    },

    logMedicationTaken: async (prescriptionId: number): Promise<any> => {
        const token = getAccessToken();
        if (!token) throw new Error("No auth token");

        const response = await apiClient.post('/medical-records/medication-adherence/', {
            prescription: prescriptionId
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }
};
