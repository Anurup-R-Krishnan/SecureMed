import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper function to get access token from localStorage
const getAccessToken = (): string | null => {
    try {
        const storedTokens = localStorage.getItem('auth_tokens');
        if (storedTokens) {
            const tokens = JSON.parse(storedTokens);
            return tokens.access || null;
        }
    } catch (e) {
        console.error('Failed to parse auth tokens:', e);
    }
    return null;
};

// Helper function to get refresh token from localStorage
const getRefreshToken = (): string | null => {
    try {
        const storedTokens = localStorage.getItem('auth_tokens');
        if (storedTokens) {
            const tokens = JSON.parse(storedTokens);
            return tokens.refresh || null;
        }
    } catch (e) {
        console.error('Failed to parse auth tokens:', e);
    }
    return null;
};

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = getRefreshToken();
                if (refreshToken) {
                    const response = await axios.post(`${API_URL}/auth/refresh/`, {
                        refresh: refreshToken,
                    });

                    if (response.status === 200) {
                        // Update tokens in localStorage
                        const storedTokens = localStorage.getItem('auth_tokens');
                        if (storedTokens) {
                            const tokens = JSON.parse(storedTokens);
                            tokens.access = response.data.access;
                            if (response.data.refresh) {
                                tokens.refresh = response.data.refresh;
                            }
                            localStorage.setItem('auth_tokens', JSON.stringify(tokens));
                        }

                        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
                        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
                        return api(originalRequest);
                    }
                }
            } catch (refreshError) {
                // If refresh fails, clear tokens and redirect to login
                localStorage.removeItem('auth_tokens');
                localStorage.removeItem('auth_user');
                window.location.href = '/';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export const getDashboardStats = async () => {
    return api.get('/medical-records/dashboard/stats/');
};

export default api;
