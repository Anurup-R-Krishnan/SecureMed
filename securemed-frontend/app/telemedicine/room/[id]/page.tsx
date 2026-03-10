'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { videoService } from '@/services/telemedicine';
import { toast } from 'sonner';
import { VideoRoom } from '@/components/telemedicine/video-room';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function VideoRoomPage() {
    const { user } = useAuth();
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

    const handleEndCall = () => {
        toast.success("Call ended");
        router.back();
    };

    return (
        <div className="min-h-screen bg-black p-4">
            {status === 'connecting' && (
                <div className="flex flex-col items-center justify-center min-h-[70vh] text-white gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-white/80" />
                    <p className="text-sm text-white/70">Connecting to secure room...</p>
                </div>
            )}
            {status === 'error' && (
                <div className="flex flex-col items-center justify-center min-h-[70vh] text-white gap-4">
                    <p className="text-red-400 font-semibold">Connection Failed</p>
                    <Button variant="outline" onClick={() => router.back()}>
                        Go Back
                    </Button>
                </div>
            )}
            {status === 'active' && (
                <VideoRoom
                    roomId={roomId}
                    userRole={user?.role === 'doctor' ? 'doctor' : 'patient'}
                    onEndCall={handleEndCall}
                />
            )}
        </div>
    );
}
