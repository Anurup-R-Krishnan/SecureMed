'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmergencySessionIndicatorProps {
    patientName: string;
    justification: string;
    expiresAt: string; // ISO timestamp
    onEndSession: () => void;
}

export default function EmergencySessionIndicator({
    patientName,
    justification,
    expiresAt,
    onEndSession
}: EmergencySessionIndicatorProps) {
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date().getTime();
            const expiry = new Date(expiresAt).getTime();
            const diff = expiry - now;

            if (diff <= 0) {
                setIsExpired(true);
                setTimeRemaining('EXPIRED');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [expiresAt]);

    // Auto-logout when expired
    useEffect(() => {
        if (isExpired) {
            const timeout = setTimeout(() => {
                onEndSession();
            }, 3000); // Give 3 seconds to see the expiry message

            return () => clearTimeout(timeout);
        }
    }, [isExpired, onEndSession]);

    return (
        <>
            {/* Red Border Overlay */}
            <div className="fixed inset-0 pointer-events-none z-[9999]">
                <div className="absolute inset-0 border-8 border-red-600 animate-pulse shadow-[inset_0_0_50px_rgba(220,38,38,0.3)]" />
            </div>

            {/* Emergency Session Banner */}
            <div className="fixed top-0 left-0 right-0 z-[10000] bg-gradient-to-r from-red-600 via-red-700 to-red-600 text-white shadow-2xl">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                        {/* Left: Emergency Icon and Info */}
                        <div className="flex items-center gap-4 flex-1">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm animate-pulse">
                                <AlertTriangle className="h-7 w-7 text-white" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-lg font-black uppercase tracking-wider">
                                        ⚠️ Emergency Access Active
                                    </h3>
                                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                                        <Shield className="h-4 w-4" />
                                        <span className="text-xs font-bold">Break-Glass Protocol</span>
                                    </div>
                                </div>
                                <p className="text-sm text-white/90">
                                    Accessing restricted records for: <span className="font-bold">{patientName}</span>
                                </p>
                                <p className="text-xs text-white/70 mt-0.5 line-clamp-1">
                                    Reason: {justification}
                                </p>
                            </div>
                        </div>

                        {/* Center: Timer */}
                        <div className="flex items-center gap-3 bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-md border-2 border-white/20">
                            <Clock className={`h-5 w-5 ${isExpired ? 'text-yellow-300 animate-bounce' : ''}`} />
                            <div className="text-center">
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                                    {isExpired ? 'Session' : 'Time Remaining'}
                                </p>
                                <p className={`text-2xl font-black tabular-nums ${isExpired ? 'text-yellow-300 animate-pulse' : ''}`}>
                                    {timeRemaining}
                                </p>
                            </div>
                        </div>

                        {/* Right: End Session Button */}
                        <Button
                            onClick={onEndSession}
                            variant="outline"
                            className="bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50 backdrop-blur-sm font-bold h-12 px-6 rounded-xl"
                        >
                            <X className="h-4 w-4 mr-2" />
                            End Session
                        </Button>
                    </div>
                </div>
            </div>

            {/* Spacer to prevent content from being hidden under banner */}
            <div className="h-20" />

            {/* Expiry Warning */}
            {isExpired && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[10001]">
                    <div className="bg-red-600 text-white p-12 rounded-3xl shadow-2xl max-w-md text-center animate-in zoom-in duration-300">
                        <AlertTriangle className="h-20 w-20 mx-auto mb-6 animate-bounce" />
                        <h2 className="text-3xl font-black mb-4">Session Expired</h2>
                        <p className="text-lg mb-6">
                            Your emergency access session has expired. You will be logged out shortly.
                        </p>
                        <div className="flex gap-3">
                            <Button
                                onClick={onEndSession}
                                className="flex-1 bg-white text-red-600 hover:bg-gray-100 font-bold h-14 text-lg"
                            >
                                Exit Now
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
