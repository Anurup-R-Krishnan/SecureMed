import { apiClient } from '@/lib/unified-api-client';

export interface PharmacyOrder {
  id: number;
  status: string;
  pickup_code: string;
  verification_notes?: string;
  created_at: string;
  prescription_details: {
    medication_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
    status: string;
  };
  patient_details: {
    id: number;
    patient_id: string;
    name: string;
  };
}

export const pharmacyService = {
  getOrders: async (): Promise<PharmacyOrder[]> => {
    const response = await apiClient.get<any>('/medical-records/pharmacy-orders/');
    return Array.isArray(response) ? response : (response as any)?.results || [];
  },

  verifyOrder: async (orderId: number, notes: string) => {
    return await apiClient.post(`/medical-records/pharmacy-orders/${orderId}/verify/`, { notes });
  },

  fulfillOrder: async (orderId: number, pickupCode?: string) => {
    return await apiClient.post(`/medical-records/pharmacy-orders/${orderId}/fulfill/`, {
      pickup_code: pickupCode || ''
    });
  }
};
