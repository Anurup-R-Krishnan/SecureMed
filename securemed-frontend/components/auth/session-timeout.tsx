'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Timeout settings (in milliseconds)
const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes total
const WARNING_TIME = 60 * 1000; // Show warning 60 seconds before timeout

export default function SessionTimeout() {
    const { isAuthenticated, logout } = useAuth();
    const router = useRouter();
    const [showWarning, setShowWarning] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(60);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityTimeRef = useRef<number>(Date.now());
    const showWarningRef = useRef<boolean>(false); // Ref to track real-time warning state

    // Handle auto-logout when time runs out
    const handleAutoLogout = useCallback(async () => {
        setShowWarning(false);
        await logout();
        router.push('/');
    }, [logout, router]);

    // Reset the idle timer
    const resetTimer = useCallback(() => {
        // Clear existing timers
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (warningTimeoutRef.current) {
            clearTimeout(warningTimeoutRef.current);
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
        }

        // Hide warning if it's showing
        setShowWarning(false);
        setRemainingSeconds(60);

        // Set warning timer (show warning 60 seconds before logout)
        warningTimeoutRef.current = setTimeout(() => {
            setShowWarning(true);
            setRemainingSeconds(60);

            // Start countdown
            countdownIntervalRef.current = setInterval(() => {
                setRemainingSeconds((prev) => {
                    if (prev <= 1) {
                        if (countdownIntervalRef.current) {
                            clearInterval(countdownIntervalRef.current);
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }, IDLE_TIMEOUT - WARNING_TIME);

        // Set auto-logout timer
        timeoutRef.current = setTimeout(() => {
            handleAutoLogout();
        }, IDLE_TIMEOUT);
    }, [handleAutoLogout]);

    // Handle "Stay Logged In" button
    const handleStayLoggedIn = () => {
        resetTimer();
    };

    // Handle "Logout Now" button
    const handleLogoutNow = async () => {
        setShowWarning(false);
        await logout();
        router.push('/');
    };

    // Sync showWarningRef with showWarning state to avoid stale closure
    useEffect(() => {
        showWarningRef.current = showWarning;
    }, [showWarning]);

    // Set up activity listeners
    useEffect(() => {
        if (!isAuthenticated) {
            // Clear all timers if user is not authenticated
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            return;
        }

        // Activity events to listen for
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        // Reset timer on any activity with debouncing
        const handleActivity = (event: Event) => {
            // Only process trusted events (real user interactions)
            if (!event.isTrusted) return;

            // EXIT immediately if warning is showing - use ref to avoid stale closure
            if (showWarningRef.current) return;

            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityTimeRef.current;

            // Debounce: only reset if at least 1 second has passed since last activity
            if (timeSinceLastActivity >= 1000) {
                lastActivityTimeRef.current = now;
                resetTimer();
            }
        };

        // Add event listeners
        events.forEach((event) => {
            window.addEventListener(event, handleActivity as EventListener);
        });

        // Initialize timer
        resetTimer();

        // Cleanup
        return () => {
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity as EventListener);
            });
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    }, [isAuthenticated, resetTimer]);

    // Don't render anything if user is not authenticated
    if (!isAuthenticated) {
        return null;
    }

    return (
        <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Session Expiring</AlertDialogTitle>
                    <AlertDialogDescription>
                        You will be logged out in <strong>{remainingSeconds} seconds</strong> due to inactivity.
                        <br />
                        <br />
                        Click &quot;Stay Logged In&quot; to continue your session, or &quot;Logout Now&quot; to logout immediately.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleLogoutNow}>
                        Logout Now
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleStayLoggedIn}>
                        Stay Logged In
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
