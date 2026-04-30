/**
 * Modernized Patients Service
 * Uses unified API client with automatic retry logic and React Query for caching
 * 
 * This is an example of how to migrate existing services to use:
 * 1. Unified API client (with retry logic and deduplication)
 * 2. React Query hooks (with automatic caching and invalidation)
 */

import { apiClient } from '@/lib/unified-api-client';
import {
  usePatients,
  usePatient,
  usePatientTimeline,
  useCreatePatient,
  useUpdatePatient,
  useMedicalRecords,
  useDashboardStats,
  ListParams,
} from '@/hooks/useApi';

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

/**
 * Legacy service methods (if needed for non-React code)
 * Consider migrating to use React Query hooks instead
 */
export const patientService = {
  /**
   * Fetch patients list with pagination
   * 
   * @example
   * const response = await patientService.getPatients({ page: 1, page_size: 20 });
   */
  async getPatients(params?: ListParams) {
    try {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
      }
      const url = `/patients/?${queryParams.toString()}`;
      const response = await apiClient.get<any>(url);
      
      // Handle both paginated and plain array responses
      if (Array.isArray(response)) return response;
      return response?.results || [];
    } catch (error) {
      console.error('Error fetching patients:', error);
      return [];
    }
  },

  /**
   * Fetch a single patient by ID
   */
  async getPatientById(id: number | string) {
    try {
      return await apiClient.get(`/patients/${id}/`);
    } catch (error) {
      console.error(`Error fetching patient ${id}:`, error);
      return null;
    }
  },

  /**
   * Fetch patient timeline
   */
  async getPatientTimeline(patientId?: string) {
    try {
      const params = patientId ? `?patient_id=${patientId}` : '';
      return await apiClient.get(`/medical-records/timeline/${params}`);
    } catch (error) {
      console.error('Error fetching patient timeline:', error);
      return { timeline: [], total_events: 0 };
    }
  },

  /**
   * Get insurance information from patient profile
   */
  async getInsuranceInfo() {
    try {
      const response = await apiClient.get('/patients/profile/');
      return {
        provider: response.insurance_provider || 'Not provided',
        policyNumber: response.insurance_number || 'N/A',
        groupNumber: 'N/A',
        expiryDate: 'N/A',
      };
    } catch (error) {
      console.error('Error fetching insurance info:', error);
      return null;
    }
  },

  /**
   * Get patient overview/dashboard stats
   */
  async getPatientOverview(patientId: string) {
    try {
      return await apiClient.get(`/medical-records/dashboard/stats/?patient_id=${patientId}`);
    } catch (error) {
      console.error('Error fetching patient overview:', error);
      return null;
    }
  },

  /**
   * Get active medications
   */
  async getActiveMedications() {
    try {
      return await apiClient.get('/medical-records/pharmacy-orders/');
    } catch (error) {
      console.error('Error fetching medications:', error);
      return [];
    }
  },

  /**
   * Create a new patient
   */
  async createPatient(data: any) {
    try {
      return await apiClient.post('/patients/', data);
    } catch (error) {
      console.error('Error creating patient:', error);
      throw error;
    }
  },

  /**
   * Update patient information
   */
  async updatePatient(id: number | string, data: any) {
    try {
      return await apiClient.patch(`/patients/${id}/`, data);
    } catch (error) {
      console.error(`Error updating patient ${id}:`, error);
      throw error;
    }
  },
};

/**
 * RECOMMENDED: Use React Query hooks in React components instead of patientService
 * 
 * @example
 * function PatientsList() {
 *   const { data, isLoading, error } = usePatients({ page_size: 20 });
 * 
 *   if (isLoading) return <LoadingSkeleton />;
 *   if (error) return <ErrorBoundary error={error} />;
 *   if (!data?.results) return <NoData />;
 * 
 *   return (
 *     <div>
 *       {data.results.map(patient => (
 *         <PatientCard key={patient.id} patient={patient} />
 *       ))}
 *       <Pagination total={data.count} />
 *     </div>
 *   );
 * }
 */

// Export React Query hooks for use in components
export { usePatients, usePatient, usePatientTimeline, useCreatePatient, useUpdatePatient };
