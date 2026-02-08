/**
 * Admin Service
 * Handles API calls for admin portal functionality
 */
import apiClient from '@/lib/api';

// Types
export interface Hospital {
    id: number;
    name: string;
    location: string;
    beds: number;
    occupancy: string;
    doctors: number;
}

export interface StaffMember {
    id: number;
    name: string;
    role: string;
    hospital: string;
    status: 'Active' | 'On Leave' | 'Inactive';
    email?: string;
}

export interface DashboardStats {
    totalPatients: number;
    hospitalOccupancy: string;
    totalRevenue: string;
    activeDoctors: number;
}

export interface SystemAlert {
    id: number;
    type: 'warning' | 'info' | 'success' | 'error';
    title: string;
    message: string;
    timestamp: string;
}

// API Functions
export const adminService = {
    /**
     * Get dashboard statistics
     */
    async getDashboardStats(): Promise<DashboardStats> {
        try {
            const response = await apiClient.get('/admin/dashboard/stats/');
            return response.data;
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            // Return placeholder data if API not available
            return {
                totalPatients: 0,
                hospitalOccupancy: '0%',
                totalRevenue: '₹0',
                activeDoctors: 0,
            };
        }
    },

    /**
     * Get list of hospitals
     */
    async getHospitals(): Promise<Hospital[]> {
        try {
            const response = await apiClient.get('/admin/hospitals/');
            return response.data;
        } catch (error) {
            console.error('Error fetching hospitals:', error);
            // Return empty array if API not available
            return [];
        }
    },

    /**
     * Get list of staff members
     */
    async getStaff(): Promise<StaffMember[]> {
        try {
            const response = await apiClient.get('/admin/staff/');
            return response.data;
        } catch (error) {
            console.error('Error fetching staff:', error);
            // Return empty array if API not available
            return [];
        }
    },

    /**
     * Get system alerts
     */
    async getAlerts(): Promise<SystemAlert[]> {
        try {
            const response = await apiClient.get('/admin/alerts/');
            return response.data;
        } catch (error) {
            console.error('Error fetching alerts:', error);
            return [];
        }
    },

    /**
     * Get all users (for user management)
     */
    async getUsers(): Promise<any[]> {
        try {
            const response = await apiClient.get('/auth/users/');
            return response.data;
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    },

    /**
     * Get list of all patients
     */
    async getPatients(): Promise<any[]> {
        try {
            const response = await apiClient.get('/patients/');
            // Handle pagination if needed, for now assume list or results
            if (response.data && Array.isArray(response.data)) {
                return response.data;
            } else if (response.data && response.data.results) {
                return response.data.results;
            }
            return [];
        } catch (error) {
            console.error('Error fetching patients:', error);
            return [];
        }
    },

    /**
     * Get system audit logs
     */
    async getAuditLogs(): Promise<string[]> {
        try {
            const response = await apiClient.get('/admin/audit-logs/');
            return response.data.logs || [];
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            return [];
        }
    },
};

export default adminService;
