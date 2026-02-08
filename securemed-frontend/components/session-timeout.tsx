'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

interface SessionTimeoutProps {
    idleTimeout?: number; // milliseconds (default: 15 minutes)
    warningTime?: number; // milliseconds before timeout to show warning (default: 2 minutes)
}

export default function SessionTimeout({
    idleTimeout = 15 * 60 * 1000, // 15 minutes
    warningTime = 2 * 60 * 1000   // 2 minutes
}: SessionTimeoutProps) {
    const router = useRouter();
    const [showWarning, setShowWarning] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    const logout = useCallback(async () => {
        try {
            // Call logout API
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout/`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear tokens and redirect
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            router.push('/login?session_expired=true');
        }
    }, [router]);

    const resetTimer = useCallback(() => {
        // Clear existing timers
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);

        setShowWarning(false);

        // Set warning timer
        warningTimeoutRef.current = setTimeout(() => {
            setShowWarning(true);
            setTimeRemaining(warningTime);

            // Start countdown
            countdownRef.current = setInterval(() => {
                setTimeRemaining((prev) => {
                    if (prev <= 1000) {
                        return 0;
                    }
                    return prev - 1000;
                });
            }, 1000);
        }, idleTimeout - warningTime);

        // Set logout timer
        timeoutRef.current = setTimeout(() => {
            logout();
        }, idleTimeout);
    }, [idleTimeout, warningTime, logout]);

    const handleUserActivity = useCallback(() => {
        if (!showWarning) {
            resetTimer();
        }
    }, [showWarning, resetTimer]);

    const handleContinueSession = () => {
        setShowWarning(false);
        resetTimer();
    };

    useEffect(() => {
        // Events that indicate user activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

        events.forEach(event => {
            document.addEventListener(event, handleUserActivity);
        });

        // Initialize timer
        resetTimer();

        return () => {
            events.forEach(event => {
                document.removeEventListener(event, handleUserActivity);
            });
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [handleUserActivity, resetTimer]);

    if (!showWarning) return null;

    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-lg border border-warning bg-card p-6 shadow-xl">
                <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-full bg-warning/10 p-3">
                        <AlertTriangle className="h-6 w-6 text-warning" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Session Timeout Warning</h2>
                </div>

                <p className="mb-4 text-muted-foreground">
                    Your session will expire due to inactivity. You will be automatically logged out in:
                </p>

                <div className="mb-6 rounded-lg bg-warning/10 p-4 text-center">
                    <p className="text-3xl font-bold text-warning">
                        {minutes}:{seconds.toString().padStart(2, '0')}
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={logout}
                        className="flex-1 rounded-lg border border-border bg-background px-4 py-3 font-semibold text-foreground hover:bg-accent transition-colors"
                    >
                        Logout Now
                    </button>
                    <button
                        onClick={handleContinueSession}
                        className="flex-1 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        Continue Session
                    </button>
                </div>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                    Click "Continue Session" or perform any action to stay logged in
                </p>
            </div>
        </div>
    );
}
