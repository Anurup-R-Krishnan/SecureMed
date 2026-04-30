/**
 * Admin Service
 * Handles API calls for admin portal functionality
 */
import { apiClient } from '@/lib/unified-api-client';

// Types
export interface Hospital {
    id: number;
    name: string;
    location: string;
    beds: number;
    occupancy_percent: number;
    doctors: number;
}

export interface StaffMember {
    id: number;
    user_id?: number;
    name: string;
    role: string;
    hospital: string;
    status: 'Active' | 'On Leave' | 'Inactive';
    email?: string;
    is_active?: boolean;
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

// Audit Log types
export interface AuditLogEntry {
    id: number;
    timestamp: string;
    actor_email: string;
    actor_name: string;
    action: string;
    action_display: string;
    category: string;
    resource_type: string;
    resource_id: string;
    description: string;
    ip_address: string;
}

export interface AuditLogFilters {
    action?: string;
    category?: string;
    actor_id?: string;
    resource_type?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    page?: number;
    page_size?: number;
}

export interface AuditLogResponse {
    logs: AuditLogEntry[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
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
            throw error;
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
            throw error;
        }
    },

    async createHospital(payload: {
        name: string;
        location: string;
        beds: number;
        occupancy_percent: number;
        doctors: number;
    }): Promise<Hospital> {
        const response = await apiClient.post('/admin/hospitals/', payload);
        return response.data;
    },

    async updateHospital(id: number, payload: Partial<{
        name: string;
        location: string;
        beds: number;
        occupancy_percent: number;
        doctors: number;
    }>): Promise<Hospital> {
        const response = await apiClient.patch(`/admin/hospitals/${id}/`, payload);
        return response.data;
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
            throw error;
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
            throw error;
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
            throw error;
        }
    },

    /**
     * Get list of all patients
     */
    async getPatients(search?: string): Promise<any[]> {
        try {
            const response = await apiClient.get('/patients/', {
                params: search ? { search } : undefined,
            });
            // Handle pagination if needed, for now assume list or results
            if (response.data && Array.isArray(response.data)) {
                return response.data;
            } else if (response.data && response.data.results) {
                return response.data.results;
            }
            return [];
        } catch (error) {
            console.error('Error fetching patients:', error);
            throw error;
        }
    },

    /**
     * Get system audit logs (structured, paginated, filterable)
     */
    async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogResponse> {
        try {
            const params = new URLSearchParams();
            if (filters.action) params.set('action', filters.action);
            if (filters.category) params.set('category', filters.category);
            if (filters.actor_id) params.set('actor_id', filters.actor_id);
            if (filters.resource_type) params.set('resource_type', filters.resource_type);
            if (filters.date_from) params.set('date_from', filters.date_from);
            if (filters.date_to) params.set('date_to', filters.date_to);
            if (filters.search) params.set('search', filters.search);
            if (filters.page) params.set('page', String(filters.page));
            if (filters.page_size) params.set('page_size', String(filters.page_size));
            const qs = params.toString();
            const response = await apiClient.get(`/admin/audit-logs/${qs ? '?' + qs : ''}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            throw error;
        }
    },

    async createUser(payload: {
        username: string;
        email: string;
        first_name: string;
        last_name: string;
        role: string;
        password: string;
        password_confirm: string;
    }) {
        const response = await apiClient.post('/auth/users/create/', payload);
        return response.data;
    },

    async updateUserRole(userId: number, role: string) {
        const response = await apiClient.patch(`/auth/users/${userId}/role/`, { role });
        return response.data;
    },

    async deactivateUser(userId: number) {
        const response = await apiClient.post(`/auth/users/${userId}/deactivate/`);
        return response.data;
    },

    async activateUser(userId: number) {
        const response = await apiClient.post(`/auth/users/${userId}/activate/`);
        return response.data;
    },

    async resetUserPassword(userId: number) {
        const response = await apiClient.post(`/auth/users/${userId}/reset-password/`);
        return response.data;
    },
};

export default adminService;
