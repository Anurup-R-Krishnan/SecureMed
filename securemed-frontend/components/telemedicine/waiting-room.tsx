'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, PhoneOff, Video, User } from 'lucide-react';

interface WaitingRoomProps {
    roomId: string;
    doctorName: string;
    onAdmitted: () => void;
    onCancel: () => void;
}

export function WaitingRoom({ roomId, doctorName, onAdmitted, onCancel }: WaitingRoomProps) {
    const [waitTime, setWaitTime] = useState(0);
    const [status, setStatus] = useState<'waiting' | 'admitted'>('waiting');

    useEffect(() => {
        const interval = setInterval(() => {
            setWaitTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatWaitTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
            <div className="text-center space-y-6 max-w-md">
                {/* Doctor Avatar */}
                <div className="w-24 h-24 rounded-full bg-blue-500/20 border-2 border-blue-400/50 flex items-center justify-center mx-auto">
                    <User className="w-12 h-12 text-blue-400" />
                </div>

                <div>
                    <h2 className="text-2xl font-bold">Waiting Room</h2>
                    <p className="text-slate-400 mt-2">
                        Your consultation with <span className="text-blue-400 font-medium">{doctorName}</span> will begin shortly
                    </p>
                </div>

                {/* Waiting Animation */}
                <div className="flex items-center justify-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    <span className="text-slate-300">Waiting for doctor to admit you...</span>
                </div>

                {/* Timer */}
                <div className="bg-slate-800/50 rounded-lg px-6 py-3 border border-slate-700">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Wait time</p>
                    <p className="text-2xl font-mono text-slate-200">{formatWaitTime(waitTime)}</p>
                </div>

                <p className="text-sm text-slate-500">
                    Room ID: {roomId?.slice(0, 8) || 'N/A'}...
                </p>

                {/* Actions */}
                <div className="flex justify-center gap-4 pt-4">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                        <PhoneOff className="w-4 h-4 mr-2" />
                        Leave
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default WaitingRoom;
