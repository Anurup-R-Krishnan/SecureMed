'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { TermsOfServiceModal } from '@/components/auth/terms-of-service-modal';
import { API_BASE_URL, API_ORIGIN } from '@/lib/urls';
import { parseJSON } from '@/lib/auth-utils';
import { getPortalRouteForRole } from '@/lib/routes';

interface DoctorProfile {
    doctor_id: string;
    specialization: string;
    specialization_display: string;
    qualification: string;
    experience_years: number;
    department_name: string | null;
    department_code: string | null;
    consultation_fee: string;
    rating: string;
    reviews: number;
    is_available: boolean;
}

interface PatientProfile {
    patient_id: string;
    date_of_birth: string;
    gender: string;
    blood_group: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    insurance_provider: string;
    insurance_number: string;
    allergies: string;
    chronic_conditions: string;
}

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    mfa_enabled: boolean;
    first_name?: string;
    last_name?: string;
    doctor_profile?: DoctorProfile;
    patient_profile?: PatientProfile;
}

interface Tokens {
    access: string;
    refresh: string;
}

interface AuthContextType {
    user: User | null;
    tokens: Tokens | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<LoginResult>;
    verifyMfa: (tempToken: string, code: string, isRecoveryCode?: boolean) => Promise<LoginResult>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<boolean>;
    refreshUserStatus: () => Promise<boolean>;
    triggerPolicyCheck: (token: string) => void;
}

interface LoginResult {
    status: 'SUCCESS' | 'MFA_REQUIRED';
    tempToken?: string;
    error?: string;
    requires_policy_acceptance?: boolean;
    tokens?: Tokens;
    user?: User;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [tokens, setTokens] = useState<Tokens | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [pendingPolicyToken, setPendingPolicyToken] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    const parseResponseJson = async (response: Response) => {
        const text = await response.text();
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch (error) {
            return { raw: text };
        }
    };

    // Load tokens from localStorage on mount
    useEffect(() => {
        const storedTokens = localStorage.getItem('auth_tokens');
        const storedUser = localStorage.getItem('auth_user');

        if (storedTokens && storedUser) {
            const parsedTokens = parseJSON<Tokens>(storedTokens);
            const parsedUser = parseJSON<User>(storedUser);

            if (parsedTokens && parsedUser) {
                setTokens(parsedTokens);
                setUser(parsedUser);
            } else {
                localStorage.removeItem('auth_tokens');
                localStorage.removeItem('auth_user');
            }
        }
        setIsLoading(false);
    }, []);

    const triggerPolicyCheck = (token: string) => {
        setPendingPolicyToken(token);
    };

    const handlePolicyAccepted = () => {
        setPendingPolicyToken(null);

        // Redirect based on user role using centralized routes
        if (user) {
            router.push(getPortalRouteForRole(user.role));
        }
    };

    const login = async (username: string, password: string): Promise<LoginResult> => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await parseResponseJson(response);

            if (!response.ok) {
                return {
                    status: 'SUCCESS',
                    error: data?.error || 'Login failed',
                };
            }

            // Check if MFA is required
            if (data?.mfa_required) {
                return {
                    status: 'MFA_REQUIRED',
                    tempToken: data?.temp_token,
                };
            }

            // No MFA - store tokens and user
            if (!data?.access || !data?.refresh || !data?.user) {
                return {
                    status: 'SUCCESS',
                    error: 'Invalid login response from server',
                };
            }

            const newTokens = {
                access: data.access,
                refresh: data.refresh,
            };

            setTokens(newTokens);
            setUser(data.user);

            // Persist to localStorage
            localStorage.setItem('auth_tokens', JSON.stringify(newTokens));
            localStorage.setItem('auth_user', JSON.stringify(data.user));

            return {
                status: 'SUCCESS',
                requires_policy_acceptance: data?.requires_policy_acceptance,
                tokens: newTokens,
                user: data.user
            };
        } catch (error) {
            return {
                status: 'SUCCESS',
                error: 'Network error. Please try again.',
            };
        }
    };

    const verifyMfa = async (tempToken: string, code: string, isRecoveryCode: boolean = false): Promise<LoginResult> => {
        try {
            // Build request body based on whether it's a recovery code or OTP
            const requestBody = isRecoveryCode
                ? { temp_token: tempToken, recovery_code: code }
                : { temp_token: tempToken, otp: code };

            const response = await fetch(`${API_BASE_URL}/auth/mfa/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const data = await parseResponseJson(response);

            if (!response.ok) {
                return {
                    status: 'SUCCESS', // Using SUCCESS status with error field to match pattern, or could define FAILED
                    error: data?.error || (isRecoveryCode ? 'Invalid recovery code' : 'Invalid OTP code')
                };
            }

            // Store tokens and user
            if (!data?.access || !data?.refresh || !data?.user) {
                return {
                    status: 'SUCCESS',
                    error: 'Invalid MFA response from server',
                };
            }

            const newTokens = {
                access: data.access,
                refresh: data.refresh,
            };

            setTokens(newTokens);
            setUser(data.user);

            // Persist to localStorage
            localStorage.setItem('auth_tokens', JSON.stringify(newTokens));
            localStorage.setItem('auth_user', JSON.stringify(data.user));

            return {
                status: 'SUCCESS',
                requires_policy_acceptance: data?.requires_policy_acceptance,
                tokens: newTokens,
                user: data.user
            };
        } catch (error) {
            return {
                status: 'SUCCESS',
                error: 'Network error. Please try again.'
            };
        }
    };

    const refreshToken = async (): Promise<boolean> => {
        if (!tokens?.refresh) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh: tokens.refresh }),
            });

            const data = await parseResponseJson(response);

            if (!response.ok) {
                logout();
                return false;
            }

            if (!data?.access || !data?.refresh) {
                logout();
                return false;
            }

            const newTokens = {
                access: data.access,
                refresh: data.refresh,
            };

            setTokens(newTokens);
            localStorage.setItem('auth_tokens', JSON.stringify(newTokens));

            return true;
        } catch (error) {
            logout();
            return false;
        }
    };

    const refreshUserStatus = async (): Promise<boolean> => {
        try {
            if (!tokens?.access) {
                return false;
            }

            const response = await fetch(`${API_BASE_URL}/auth/user/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tokens.access}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                return false;
            }

            const userData = await parseResponseJson(response);

            // Update user state and localStorage
            if (!userData) {
                return false;
            }

            setUser(userData);
            localStorage.setItem('auth_user', JSON.stringify(userData));

            return true;
        } catch (error) {
            return false;
        }
    };

    const logout = async () => {
        // Call backend logout API to blacklist the refresh token
        try {
            // Try to get refresh token from state first, then fallback to localStorage
            let refreshToken = tokens?.refresh;

            if (!refreshToken) {
                // Fallback: try to get from localStorage
                const storedTokens = localStorage.getItem('auth_tokens');
                if (storedTokens) {
                    try {
                        const parsedTokens = parseJSON<Tokens>(storedTokens);
                        refreshToken = parsedTokens?.refresh;
                    } catch (e) {
                    }
                }
            }

            // Only call backend if we have both access and refresh tokens
            if (tokens?.access && refreshToken) {

                const response = await fetch(`${API_BASE_URL}/auth/logout/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${tokens.access}`,
                    },
                    body: JSON.stringify({ refresh: refreshToken }),
                });

                if (!response.ok) {
                    const errorData = await parseResponseJson(response);
                } else {
                }
            } else {
            }
        } catch (error) {
            // Log error but continue with logout - we always want to clear local state
        }

        // Always clear local state regardless of backend call result
        setUser(null);
        setTokens(null);
        localStorage.removeItem('auth_tokens');
        localStorage.removeItem('auth_user');
        localStorage.setItem('post_logout_redirect', '/');

        toast({
            title: 'Logged out',
            description: 'You have been successfully logged out.',
        });
    };

    const value: AuthContextType = {
        user,
        tokens,
        isAuthenticated: !!user && !!tokens,
        isLoading,
        login,
        verifyMfa,
        logout,
        refreshToken,
        refreshUserStatus,
        triggerPolicyCheck,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
            <TermsOfServiceModal
                isOpen={!!pendingPolicyToken}
                token={pendingPolicyToken}
                onAccept={handlePolicyAccepted}
            />
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
