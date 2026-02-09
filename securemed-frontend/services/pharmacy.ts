import api from '@/lib/api';
import { getAccessToken } from '@/lib/auth-utils';

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
    const token = getAccessToken();
    if (!token) return [];
    const response = await api.get('/medical-records/pharmacy-orders/', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return Array.isArray(response.data) ? response.data :
      (response.data.results ? response.data.results : []);
  },

  verifyOrder: async (orderId: number, notes: string) => {
    const token = getAccessToken();
    if (!token) throw new Error('No auth token');
    const response = await api.post(`/medical-records/pharmacy-orders/${orderId}/verify/`, {
      notes
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  fulfillOrder: async (orderId: number, pickupCode?: string) => {
    const token = getAccessToken();
    if (!token) throw new Error('No auth token');
    const response = await api.post(`/medical-records/pharmacy-orders/${orderId}/fulfill/`, {
      pickup_code: pickupCode || ''
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};
