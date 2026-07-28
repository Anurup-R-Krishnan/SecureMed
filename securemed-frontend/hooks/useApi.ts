/**
 * React Query Hooks for SecureMed API
 *
 * Provides reusable hooks for data fetching with automatic caching,
 * refetching, and error handling.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import {
  apiClient,
  PaginatedResponse,
  ApiErrorResponse,
} from "@/lib/unified-api-client";

// Query Keys
export const queryKeys = {
  all: ["api"] as const,
  patients: () => [...queryKeys.all, "patients"] as const,
  patient: (id: number | string) => [...queryKeys.patients(), id] as const,
  patientTimeline: (id?: number | string) =>
    [...queryKeys.all, "patients", "timeline", id] as const,
  appointments: () => [...queryKeys.all, "appointments"] as const,
  appointment: (id: number | string) =>
    [...queryKeys.appointments(), id] as const,
  doctors: () => [...queryKeys.all, "doctors"] as const,
  medicalRecords: () => [...queryKeys.all, "medical-records"] as const,
  medicalRecord: (id: number | string) =>
    [...queryKeys.medicalRecords(), id] as const,
  prescriptions: () => [...queryKeys.all, "prescriptions"] as const,
  vitals: () => [...queryKeys.all, "vitals"] as const,
  labs: () => [...queryKeys.all, "labs"] as const,
  telemedicine: () => [...queryKeys.all, "telemedicine"] as const,
  pharmacyOrders: () => [...queryKeys.all, "pharmacy-orders"] as const,
  dashboardStats: () => [...queryKeys.all, "dashboard", "stats"] as const,
};

// Types
export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  fields?: string[];
  [key: string]: any;
}

// Default query options
const defaultQueryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  retry: 1,
  refetchOnWindowFocus: false,
};

/**
 * Hook for fetching paginated list of patients
 */
export function usePatients(
  params?: ListParams,
  options?: UseQueryOptions<PaginatedResponse<any>>,
) {
  return useQuery({
    queryKey: [...queryKeys.patients(), params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
      }
      const url = `/patients/?${queryParams.toString()}`;
      return apiClient.get<PaginatedResponse<any>>(url);
    },
    ...defaultQueryOptions,
    ...options,
  });
}

/**
 * Hook for fetching a single patient by ID
 */
export function usePatient(
  id: number | string | null,
  options?: UseQueryOptions<any>,
) {
  return useQuery({
    queryKey: queryKeys.patient(id as string | number),
    queryFn: () => apiClient.get(`/patients/${id}/`),
    enabled: id !== null && id !== undefined,
    ...defaultQueryOptions,
    ...options,
  });
}

/**
 * Hook for fetching patient timeline
 */
export function usePatientTimeline(
  patientId?: number | string,
  options?: UseQueryOptions<any>,
) {
  return useQuery({
    queryKey: queryKeys.patientTimeline(patientId),
    queryFn: async () => {
      const params = patientId ? `?patient_id=${patientId}` : "";
      return apiClient.get(`/medical-records/timeline/${params}`);
    },
    ...defaultQueryOptions,
    ...options,
  });
}

/**
 * Hook for creating/updating a patient (mutation)
 */
export function useCreatePatient(
  options?: UseMutationOptions<any, ApiErrorResponse, any>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => apiClient.post("/patients/", data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients() });
      queryClient.setQueryData(queryKeys.patient(data.id), data);
    },
    ...options,
  });
}

/**
 * Hook for updating a patient (mutation)
 */
export function useUpdatePatient(
  id: number | string,
  options?: UseMutationOptions<any, ApiErrorResponse, any>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => apiClient.patch(`/patients/${id}/`, data),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.patient(id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.patients() });
    },
    ...options,
  });
}

/**
 * Hook for fetching appointments
 */
export function useAppointments(
  params?: ListParams,
  options?: UseQueryOptions<PaginatedResponse<any>>,
) {
  return useQuery({
    queryKey: [...queryKeys.appointments(), params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
      }
      const url = `/appointments/appointments/?${queryParams.toString()}`;
      return apiClient.get<PaginatedResponse<any>>(url);
    },
    ...defaultQueryOptions,
    ...options,
  });
}

/**
 * Hook for fetching a single appointment
 */
export function useAppointment(
  id: number | string | null,
  options?: UseQueryOptions<any>,
) {
  return useQuery({
    queryKey: queryKeys.appointment(id as string | number),
    queryFn: () => apiClient.get(`/appointments/appointments/${id}/`),
    enabled: id !== null && id !== undefined,
    ...defaultQueryOptions,
    ...options,
  });
}

/**
 * Hook for fetching doctors (with optional filters)
 */
export function useDoctors(
  params?: { specialty?: string; search?: string; [key: string]: any },
  options?: UseQueryOptions<any>,
) {
  return useQuery({
    queryKey: [...queryKeys.doctors(), params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
      }
      const url = `/appointments/doctors/?${queryParams.toString()}`;
      const data = await apiClient.get<any>(url);
      // Handle both array and paginated responses
      return Array.isArray(data) ? data : data.results || [];
    },
    ...defaultQueryOptions,
    ...options,
  });
}

/**
 * Hook for creating an appointment
 */
export function useCreateAppointment(
  options?: UseMutationOptions<any, ApiErrorResponse, any>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      apiClient.post("/appointments/appointments/", data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments() });
      queryClient.setQueryData(queryKeys.appointment(data.id), data);
    },
    ...options,
  });
}

/**
 * Hook for updating an appointment
 */
export function useUpdateAppointment(
  id: number | string,
  options?: UseMutationOptions<any, ApiErrorResponse, any>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      apiClient.patch(`/appointments/appointments/${id}/`, data),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.appointment(id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments() });
    },
    ...options,
  });
}

/**
 * Hook for cancelling an appointment
 */
export function useCancelAppointment(
  id: number | string,
  options?: UseMutationOptions<any, ApiErrorResponse, any>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason?: string) =>
      apiClient.patch(`/appointments/appointments/${id}/`, {
        status: "cancelled",
        cancellation_reason: reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointment(id) });
    },
    ...options,
  });
}

/**
 * Hook for fetching medical records
 */
export function useMedicalRecords(
  params?: ListParams,
  options?: UseQueryOptions<PaginatedResponse<any>>,
) {
  return useQuery({
    queryKey: [...queryKeys.medicalRecords(), params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
      }
      const url = `/medical-records/records/?${queryParams.toString()}`;
      return apiClient.get<PaginatedResponse<any>>(url);
    },
    ...defaultQueryOptions,
    ...options,
  });
}

/**
 * Hook for fetching a single medical record
 */
export function useMedicalRecord(
  id: number | string | null,
  options?: UseQueryOptions<any>,
) {
  return useQuery({
    queryKey: queryKeys.medicalRecord(id as string | number),
    queryFn: () => apiClient.get(`/medical-records/records/${id}/`),
    enabled: id !== null && id !== undefined,
    ...defaultQueryOptions,
    ...options,
  });
}

/**
 * Hook for fetching prescriptions
 */
export function usePrescriptions(
  params?: ListParams,
  options?: UseQueryOptions<PaginatedResponse<any>>,
) {
  return useQuery({
    queryKey: [...queryKeys.prescriptions(), params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
      }
      const url = `/medical-records/prescriptions/?${queryParams.toString()}`;
      return apiClient.get<PaginatedResponse<any>>(url);
    },
    ...defaultQueryOptions,
    ...options,
  });
}

/**
 * Hook for fetching vital signs
 */
export function useVitals(
  params?: ListParams,
  options?: UseQueryOptions<PaginatedResponse<any>>,
) {
  return useQuery({
    queryKey: [...queryKeys.vitals(), params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
      }
      const url = `/medical-records/vitals/?${queryParams.toString()}`;
      return apiClient.get<PaginatedResponse<any>>(url);
    },
    ...defaultQueryOptions,
    ...options,
  });
}

/**
 * Hook for creating vital signs
 */
export function useCreateVitals(
  options?: UseMutationOptions<any, ApiErrorResponse, any>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => apiClient.post("/medical-records/vitals/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vitals() });
    },
    ...options,
  });
}

/**
 * Hook for fetching lab results
 */
export function useLabs(
  params?: ListParams,
  options?: UseQueryOptions<PaginatedResponse<any>>,
) {
  return useQuery({
    queryKey: [...queryKeys.labs(), params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
      }
      const url = `/labs/?${queryParams.toString()}`;
      return apiClient.get<PaginatedResponse<any>>(url);
    },
    ...defaultQueryOptions,
    ...options,
  });
}

/**
 * Hook for fetching telemedicine sessions
 */
export function useTelemedicineSessions(
  params?: ListParams,
  options?: UseQueryOptions<PaginatedResponse<any>>,
) {
  return useQuery({
    queryKey: [...queryKeys.telemedicine(), params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
      }
      const url = `/telemedicine/rooms/?${queryParams.toString()}`;
      return apiClient.get<PaginatedResponse<any>>(url);
    },
    ...defaultQueryOptions,
    ...options,
  });
}

/**
 * Hook for creating a telemedicine session
 */
export function useCreateTelemedicineSession(
  options?: UseMutationOptions<any, ApiErrorResponse, any>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => apiClient.post("/telemedicine/rooms/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.telemedicine() });
    },
    ...options,
  });
}

/**
 * Hook for fetching pharmacy orders
 */
export function usePharmacyOrders(
  params?: ListParams,
  options?: UseQueryOptions<PaginatedResponse<any>>,
) {
  return useQuery({
    queryKey: [...queryKeys.pharmacyOrders(), params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
      }
      const url = `/medical-records/pharmacy-orders/?${queryParams.toString()}`;
      return apiClient.get<PaginatedResponse<any>>(url);
    },
    ...defaultQueryOptions,
    ...options,
  });
}

/**
 * Hook for fetching dashboard statistics
 */
export function useDashboardStats(options?: UseQueryOptions<any>) {
  return useQuery({
    queryKey: queryKeys.dashboardStats(),
    queryFn: () => apiClient.get("/medical-records/dashboard/stats/"),
    ...defaultQueryOptions,
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter for stats)
    ...options,
  });
}
