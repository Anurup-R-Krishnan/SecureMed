'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

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
    verifyMfa: (tempToken: string, otp: string) => Promise<boolean>;
    logout: () => void;
    refreshToken: () => Promise<boolean>;
}

interface LoginResult {
    status: 'SUCCESS' | 'MFA_REQUIRED';
    tempToken?: string;
    error?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [tokens, setTokens] = useState<Tokens | null>(null);
    const { toast } = useToast();

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

            return { status: 'SUCCESS' };
        } catch (error) {
            console.error('Login error:', error);
            return {
                status: 'SUCCESS',
                error: 'Network error. Please try again.',
            };
        }
    };

    const verifyMfa = async (tempToken: string, otp: string): Promise<boolean> => {
        try {
            const response = await fetch('http://localhost:8000/api/auth/mfa/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ temp_token: tempToken, otp }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast({
                    title: 'MFA Verification Failed',
                    description: data.error || 'Invalid OTP code',
                    variant: 'destructive',
                });
                return false;
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

            return true;
        } catch (error) {
            console.error('MFA verification error:', error);
            toast({
                title: 'Error',
                description: 'Network error. Please try again.',
                variant: 'destructive',
            });
            return false;
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

    const logout = () => {
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
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
