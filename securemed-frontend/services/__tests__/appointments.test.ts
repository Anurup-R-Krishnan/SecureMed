import { appointmentService, medicalRecordService } from '../appointments';
import api from '@/lib/api';

// Mock the API module
jest.mock('@/lib/api');

describe('AppointmentService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getDoctors', () => {
        it('should fetch doctors successfully', async () => {
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Cardiology' },
                { id: 2, name: 'Dr. Jones', specialization: 'Neurology' }
            ];

            (api.get as jest.Mock).mockResolvedValue({ data: mockDoctors });

            const result = await appointmentService.getDoctors();

            expect(result).toEqual(mockDoctors);
            expect(api.get).toHaveBeenCalledWith('/appointments/doctors/?');
        });

        it('should fetch doctors with specialty filter', async () => {
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Cardiology' }
            ];

            (api.get as jest.Mock).mockResolvedValue({ data: mockDoctors });

            const result = await appointmentService.getDoctors('Cardiology');

            expect(result).toEqual(mockDoctors);
            expect(api.get).toHaveBeenCalledWith('/appointments/doctors/?specialty=Cardiology');
        });

        it('should fetch doctors with search query', async () => {
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Cardiology' }
            ];

            (api.get as jest.Mock).mockResolvedValue({ data: mockDoctors });

            const result = await appointmentService.getDoctors(undefined, 'Smith');

            expect(result).toEqual(mockDoctors);
            expect(api.get).toHaveBeenCalledWith('/appointments/doctors/?search=Smith');
        });

        it('should handle paginated response', async () => {
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Cardiology' }
            ];

            (api.get as jest.Mock).mockResolvedValue({
                data: {
                    results: mockDoctors,
                    count: 1,
                    next: null,
                    previous: null
                }
            });

            const result = await appointmentService.getDoctors();

            expect(result).toEqual(mockDoctors);
        });

        it('should return empty array on error', async () => {
            (api.get as jest.Mock).mockRejectedValue(new Error('Network error'));

            const result = await appointmentService.getDoctors();

            expect(result).toEqual([]);
        });
    });

    describe('getAppointments', () => {
        it('should fetch appointments successfully', async () => {
            const mockAppointments = [
                {
                    id: 1,
                    appointment_id: 'APT-001',
                    doctor_name: 'Dr. Smith',
                    appointment_date: '2026-02-10',
                    status: 'scheduled'
                }
            ];

            (api.get as jest.Mock).mockResolvedValue({ data: mockAppointments });

            const result = await appointmentService.getAppointments();

            expect(result).toEqual(mockAppointments);
            expect(api.get).toHaveBeenCalledWith('/appointments/appointments/');
        });

        it('should return empty array on error', async () => {
            (api.get as jest.Mock).mockRejectedValue(new Error('Network error'));

            const result = await appointmentService.getAppointments();

            expect(result).toEqual([]);
        });
    });

    describe('createAppointment', () => {
        it('should create appointment successfully', async () => {
            const appointmentData = {
                doctor: 1,
                appointment_date: '2026-02-10',
                appointment_time: '10:00:00',
                reason: 'Regular checkup'
            };

            const mockResponse = {
                id: 1,
                appointment_id: 'APT-001',
                ...appointmentData
            };

            (api.post as jest.Mock).mockResolvedValue({ data: mockResponse });

            const result = await appointmentService.createAppointment(appointmentData);

            expect(result).toEqual(mockResponse);
            expect(api.post).toHaveBeenCalledWith('/appointments/appointments/', appointmentData);
        });

        it('should throw error on failed creation', async () => {
            const appointmentData = {
                doctor: 1,
                appointment_date: '2026-02-10',
                appointment_time: '10:00:00',
                reason: 'Regular checkup'
            };

            (api.post as jest.Mock).mockRejectedValue(new Error('Booking failed'));

            await expect(appointmentService.createAppointment(appointmentData))
                .rejects.toThrow('Booking failed');
        });
    });
});

describe('MedicalRecordService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getMedicalRecords', () => {
        it('should fetch medical records successfully', async () => {
            const mockRecords = [
                {
                    id: 1,
                    record_type: 'Diagnosis',
                    description: 'Hypertension',
                    date: '2026-01-15'
                }
            ];

            (api.get as jest.Mock).mockResolvedValue({ data: mockRecords });

            const result = await medicalRecordService.getMedicalRecords();

            expect(result).toEqual(mockRecords);
            expect(api.get).toHaveBeenCalledWith('/medical-records/records/');
        });

        it('should return empty array on error', async () => {
            (api.get as jest.Mock).mockRejectedValue(new Error('Network error'));

            const result = await medicalRecordService.getMedicalRecords();

            expect(result).toEqual([]);
        });

        it('should handle non-array response', async () => {
            (api.get as jest.Mock).mockResolvedValue({ data: null });

            const result = await medicalRecordService.getMedicalRecords();

            expect(result).toEqual([]);
        });
    });
});
