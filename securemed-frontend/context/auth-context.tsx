'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { TermsOfServiceModal } from '@/components/auth/terms-of-service-modal';

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    mfa_enabled: boolean;
}

interface Tokens {
    access: string;
    refresh: string;
}

interface AuthContextType {
    user: User | null;
    tokens: Tokens | null;
    isAuthenticated: boolean;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [tokens, setTokens] = useState<Tokens | null>(null);
    const [pendingPolicyToken, setPendingPolicyToken] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    // Load tokens from localStorage on mount
    useEffect(() => {
        const storedTokens = localStorage.getItem('auth_tokens');
        const storedUser = localStorage.getItem('auth_user');

        if (storedTokens && storedUser) {
            try {
                setTokens(JSON.parse(storedTokens));
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Failed to parse stored auth data:', error);
                localStorage.removeItem('auth_tokens');
                localStorage.removeItem('auth_user');
            }
        }
    }, []);

    const triggerPolicyCheck = (token: string) => {
        setPendingPolicyToken(token);
    };

    const handlePolicyAccepted = () => {
        setPendingPolicyToken(null);

        // Redirect based on user role
        if (user) {
            if (user.role === 'doctor') {
                router.push('/doctor');
            } else if (user.role === 'patient') {
                router.push('/portal');
            } else if (user.role === 'admin') {
                window.location.href = 'http://localhost:8000/admin';
            }
        }
    };

    const login = async (username: string, password: string): Promise<LoginResult> => {
        try {
            const response = await fetch('http://localhost:8000/api/auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    status: 'SUCCESS',
                    error: data.error || 'Login failed',
                };
            }

            // Check if MFA is required
            if (data.mfa_required) {
                return {
                    status: 'MFA_REQUIRED',
                    tempToken: data.temp_token,
                };
            }

            // No MFA - store tokens and user
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
                requires_policy_acceptance: data.requires_policy_acceptance,
                tokens: newTokens
            };
        } catch (error) {
            console.error('Login error:', error);
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

            const response = await fetch('http://localhost:8000/api/auth/mfa/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    status: 'SUCCESS', // Using SUCCESS status with error field to match pattern, or could define FAILED
                    error: data.error || (isRecoveryCode ? 'Invalid recovery code' : 'Invalid OTP code')
                };
            }

            // Store tokens and user
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
                requires_policy_acceptance: data.requires_policy_acceptance,
                tokens: newTokens
            };
        } catch (error) {
            console.error('MFA verification error:', error);
            return {
                status: 'SUCCESS',
                error: 'Network error. Please try again.'
            };
        }
    };

    const refreshToken = async (): Promise<boolean> => {
        if (!tokens?.refresh) return false;

        try {
            const response = await fetch('http://localhost:8000/api/auth/refresh/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh: tokens.refresh }),
            });

            const data = await response.json();

            if (!response.ok) {
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
            console.error('Token refresh error:', error);
            logout();
            return false;
        }
    };

    const refreshUserStatus = async (): Promise<boolean> => {
        try {
            if (!tokens?.access) {
                console.error('No access token available');
                return false;
            }

            const response = await fetch('http://localhost:8000/api/auth/user/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tokens.access}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.error('Failed to fetch user profile');
                return false;
            }

            const userData = await response.json();

            // Update user state and localStorage
            setUser(userData);
            localStorage.setItem('auth_user', JSON.stringify(userData));

            return true;
        } catch (error) {
            console.error('Error refreshing user status:', error);
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
                        const parsedTokens = JSON.parse(storedTokens);
                        refreshToken = parsedTokens.refresh;
                    } catch (e) {
                        console.error('Failed to parse stored tokens:', e);
                    }
                }
            }

            // Only call backend if we have both access and refresh tokens
            if (tokens?.access && refreshToken) {
                console.log('[LOGOUT] Sending logout request to backend');
                console.log('[LOGOUT] Refresh token:', refreshToken.substring(0, 30) + '...');

                const response = await fetch('http://localhost:8000/api/auth/logout/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${tokens.access}`,
                    },
                    body: JSON.stringify({ refresh: refreshToken }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('[LOGOUT] Backend logout failed:', response.status, errorData);
                } else {
                    console.log('[LOGOUT] Backend logout successful');
                }
            } else {
                console.log('[LOGOUT] Skipping backend call - no tokens available');
            }
        } catch (error) {
            // Log error but continue with logout - we always want to clear local state
            console.error('[LOGOUT] Backend logout error:', error);
        }

        // Always clear local state regardless of backend call result
        setUser(null);
        setTokens(null);
        localStorage.removeItem('auth_tokens');
        localStorage.removeItem('auth_user');

        toast({
            title: 'Logged out',
            description: 'You have been successfully logged out.',
        });
    };

    const value: AuthContextType = {
        user,
        tokens,
        isAuthenticated: !!user && !!tokens,
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
