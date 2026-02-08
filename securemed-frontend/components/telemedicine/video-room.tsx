'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    PhoneOff,
    Monitor,
    Users,
    MessageSquare,
    Settings,
    Maximize2,
} from 'lucide-react';
import { getAccessToken } from '@/lib/auth-utils';

interface VideoRoomProps {
    roomId: string;
    userRole: 'doctor' | 'patient';
    onEndCall: () => void;
}

export function VideoRoom({ roomId, userRole, onEndCall }: VideoRoomProps) {
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isAudioOn, setIsAudioOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    // Timer for call duration
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (connectionStatus === 'connected') {
            interval = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [connectionStatus]);

    // Simulate connection after 2 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setConnectionStatus('connected');
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    // Initialize local video stream
    useEffect(() => {
        const initLocalStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error('Error accessing media devices:', err);
            }
        };

        initLocalStream();

        // Cleanup
        return () => {
            if (localVideoRef.current?.srcObject) {
                const stream = localVideoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleVideo = async () => {
        if (localVideoRef.current?.srcObject) {
            const stream = localVideoRef.current.srcObject as MediaStream;
            stream.getVideoTracks().forEach(track => {
                track.enabled = !isVideoOn;
            });
            setIsVideoOn(!isVideoOn);
        }
    };

    const toggleAudio = () => {
        if (localVideoRef.current?.srcObject) {
            const stream = localVideoRef.current.srcObject as MediaStream;
            stream.getAudioTracks().forEach(track => {
                track.enabled = !isAudioOn;
            });
            setIsAudioOn(!isAudioOn);
        }
    };

    const handleEndCall = async () => {
        // Stop all tracks
        if (localVideoRef.current?.srcObject) {
            const stream = localVideoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }

        // Call API to end room
        try {
            const token = getAccessToken();
            await fetch(`http://localhost:8000/api/telemedicine/rooms/${roomId}/end/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
        } catch (err) {
            console.error('Error ending call:', err);
        }

        onEndCall();
    };

    return (
        <div className="h-screen bg-slate-900 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' :
                        connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                            'bg-red-500'
                        }`} />
                    <span className="text-white font-medium">
                        {connectionStatus === 'connected' ? 'Connected' :
                            connectionStatus === 'connecting' ? 'Connecting...' :
                                'Disconnected'}
                    </span>
                    {connectionStatus === 'connected' && (
                        <span className="text-slate-400 font-mono">{formatDuration(callDuration)}</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">Room: {roomId.slice(0, 8)}...</span>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                        <Settings className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Video Area */}
            <div className="flex-1 relative p-4">
                {/* Remote Video (Large) */}
                <div className="absolute inset-4 bg-slate-800 rounded-2xl overflow-hidden">
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    {/* Placeholder if no remote stream */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-4">
                                <Users className="w-16 h-16 text-slate-500" />
                            </div>
                            <p className="text-slate-400">
                                {userRole === 'doctor' ? 'Waiting for patient...' : 'Connecting to doctor...'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Local Video (PiP) */}
                <div className="absolute bottom-8 right-8 w-64 h-48 bg-slate-700 rounded-xl overflow-hidden shadow-2xl border-2 border-slate-600 group">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${!isVideoOn ? 'hidden' : ''}`}
                    />
                    {!isVideoOn && (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                            <VideoOff className="w-12 h-12 text-slate-500" />
                        </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">
                            You ({userRole})
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/50 hover:bg-black/70">
                            <Maximize2 className="h-4 w-4 text-white" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 py-6 bg-slate-800 border-t border-slate-700">
                {/* Audio Toggle */}
                <Button
                    variant="outline"
                    size="lg"
                    onClick={toggleAudio}
                    className={`rounded-full h-14 w-14 ${!isAudioOn ? 'bg-red-500 border-red-500 text-white hover:bg-red-600' :
                        'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'
                        }`}
                >
                    {isAudioOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                </Button>

                {/* Video Toggle */}
                <Button
                    variant="outline"
                    size="lg"
                    onClick={toggleVideo}
                    className={`rounded-full h-14 w-14 ${!isVideoOn ? 'bg-red-500 border-red-500 text-white hover:bg-red-600' :
                        'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'
                        }`}
                >
                    {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                </Button>

                {/* Screen Share */}
                <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setIsScreenSharing(!isScreenSharing)}
                    className={`rounded-full h-14 w-14 ${isScreenSharing ? 'bg-blue-500 border-blue-500 text-white' :
                        'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'
                        }`}
                >
                    <Monitor className="h-6 w-6" />
                </Button>

                {/* Chat */}
                <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full h-14 w-14 bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                    <MessageSquare className="h-6 w-6" />
                </Button>

                {/* End Call */}
                <Button
                    variant="destructive"
                    size="lg"
                    onClick={handleEndCall}
                    className="rounded-full h-14 w-14 bg-red-600 hover:bg-red-700"
                >
                    <PhoneOff className="h-6 w-6" />
                </Button>
            </div>
        </div>
    );
}

export default VideoRoom;
