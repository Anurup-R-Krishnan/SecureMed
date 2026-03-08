'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { videoService } from '@/services/telemedicine';
import { toast } from 'sonner';

export default function VideoRoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params?.id as string;
    const [status, setStatus] = useState('connecting');

    useEffect(() => {
        if (!roomId) return;

        // Simulate joining logic
        const join = async () => {
            try {
                await videoService.joinRoom(roomId);
                setStatus('active');
                toast.success("Joined video room successfully");
            } catch (error) {
                console.error("Failed to join room", error);
                toast.error("Failed to join video room");
                setStatus('error');
            }
        };

        join();
    }, [roomId]);

    const handleEndCall = async () => {
        try {
            await videoService.endCall(roomId);
            toast.success("Call ended");
            router.back();
        } catch (error) {
            console.error("Failed to end call", error);
            toast.error("Failed to end call");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            <h1 className="text-3xl font-bold mb-4">SecureMed Video Consultation</h1>
            <div className="w-full max-w-4xl aspect-video bg-black rounded-xl border border-gray-700 flex items-center justify-center mb-6 relative overflow-hidden">
                {status === 'connecting' && <p className="animate-pulse">Connecting to secure room...</p>}
                {status === 'active' && (
                    <div className="text-center">
                        <p className="text-green-500 mb-2">● Connected (Encrypted)</p>
                        <div className="grid grid-cols-2 gap-4 w-full h-full p-4 absolute inset-0">
                            <div className="bg-gray-800 rounded-lg flex items-center justify-center border border-gray-600">
                                <p>Remote Participant (Video Placeholder)</p>
                            </div>
                            <div className="bg-gray-800 rounded-lg flex items-center justify-center border border-gray-600">
                                <p>You (Video Placeholder)</p>
                            </div>
                        </div>
                    </div>
                )}
                {status === 'error' && <p className="text-red-500">Connection Failed</p>}
            </div>

            <div className="flex gap-4">
                <Button variant="destructive" size="lg" onClick={handleEndCall}>
                    End Call
                </Button>
                <Button variant="secondary" size="lg" onClick={() => toast.info("Microphone toggled (simulated)")}>
                    Mute/Unmute
                </Button>
                <Button variant="secondary" size="lg" onClick={() => toast.info("Camera toggled (simulated)")}>
                    Video On/Off
                </Button>
            </div>
        </div>
    );
}
