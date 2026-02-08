'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Video, Clock, UserCheck, AlertCircle } from 'lucide-react';
import { getAccessToken } from '@/lib/auth-utils';

interface WaitingRoomProps {
    roomId: string;
    doctorName: string;
    appointmentTime?: string;
    onAdmitted: () => void;
    onCancel: () => void;
}

export function WaitingRoom({
    roomId,
    doctorName,
    appointmentTime,
    onAdmitted,
    onCancel,
}: WaitingRoomProps) {
    const [status, setStatus] = useState<'joining' | 'waiting' | 'admitted' | 'error'>('joining');
    const [waitTime, setWaitTime] = useState(0);
    const [message, setMessage] = useState('Connecting to the waiting room...');

    // Join the waiting room on mount
    useEffect(() => {
        const joinRoom = async () => {
            try {
                const token = getAccessToken();
                const response = await fetch(
                    `http://localhost:8000/api/telemedicine/rooms/${roomId}/join/`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (response.ok) {
                    setStatus('waiting');
                    setMessage('You are in the waiting room. The doctor will admit you shortly.');
                } else {
                    setStatus('error');
                    setMessage('Failed to join the waiting room. Please try again.');
                }
            } catch (err) {
                setStatus('error');
                setMessage('Connection error. Please check your internet connection.');
            }
        };

        joinRoom();
    }, [roomId]);

    // Poll for admission status
    useEffect(() => {
        if (status !== 'waiting') return;

        const checkStatus = async () => {
            try {
                const token = getAccessToken();
                const response = await fetch(
                    `http://localhost:8000/api/telemedicine/rooms/${roomId}/status_check/`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    }
                );

                const data = await response.json();

                if (data.status === 'active') {
                    setStatus('admitted');
                    setMessage('The doctor has admitted you. Starting video call...');
                    setTimeout(onAdmitted, 1500);
                }
            } catch (err) {
                console.error('Error checking room status:', err);
            }
        };

        const interval = setInterval(checkStatus, 3000);
        return () => clearInterval(interval);
    }, [status, roomId, onAdmitted]);

    // Wait time counter
    useEffect(() => {
        if (status !== 'waiting') return;

        const interval = setInterval(() => {
            setWaitTime(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [status]);

    const formatWaitTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins === 0) return `${secs} seconds`;
        return `${mins} min ${secs} sec`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardContent className="p-8 text-center">
                    {/* Status Icon */}
                    <div className="mb-6">
                        {status === 'joining' && (
                            <div className="w-20 h-20 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
                                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                            </div>
                        )}
                        {status === 'waiting' && (
                            <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 flex items-center justify-center animate-pulse">
                                <Clock className="w-10 h-10 text-amber-600" />
                            </div>
                        )}
                        {status === 'admitted' && (
                            <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                                <UserCheck className="w-10 h-10 text-green-600" />
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                                <AlertCircle className="w-10 h-10 text-red-600" />
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                        {status === 'joining' && 'Joining...'}
                        {status === 'waiting' && 'Virtual Waiting Room'}
                        {status === 'admitted' && 'Admitted!'}
                        {status === 'error' && 'Connection Error'}
                    </h2>

                    {/* Message */}
                    <p className="text-slate-600 mb-6">{message}</p>

                    {/* Doctor Info */}
                    <div className="bg-slate-50 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <Video className="w-5 h-5 text-blue-600" />
                            <span className="font-medium text-slate-800">Video Consultation</span>
                        </div>
                        <p className="text-slate-600">with <strong>{doctorName}</strong></p>
                        {appointmentTime && (
                            <p className="text-sm text-slate-500 mt-1">Scheduled: {appointmentTime}</p>
                        )}
                    </div>

                    {/* Wait Time */}
                    {status === 'waiting' && (
                        <div className="mb-6">
                            <p className="text-sm text-slate-500">Wait time</p>
                            <p className="text-lg font-semibold text-slate-700">{formatWaitTime(waitTime)}</p>
                        </div>
                    )}

                    {/* Tips */}
                    {status === 'waiting' && (
                        <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
                            <p className="text-sm font-medium text-blue-800 mb-2">While you wait:</p>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• Ensure your camera and microphone are working</li>
                                <li>• Find a quiet, well-lit space</li>
                                <li>• Have your medical history ready</li>
                            </ul>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 justify-center">
                        {status === 'error' && (
                            <Button onClick={() => window.location.reload()}>
                                Try Again
                            </Button>
                        )}
                        <Button variant="outline" onClick={onCancel}>
                            Leave Waiting Room
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default WaitingRoom;
