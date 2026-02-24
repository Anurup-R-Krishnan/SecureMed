'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
    Share2
} from 'lucide-react';
import { getAccessToken } from '@/lib/auth-utils';
import { API_BASE_URL } from '@/lib/urls';
import { cn } from '@/lib/utils';

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

        if (isVideoOn) {
            initLocalStream();
        }

        // Capture ref value for cleanup
        const videoElement = localVideoRef.current;

        // Cleanup
        return () => {
            if (videoElement?.srcObject) {
                const stream = videoElement.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isVideoOn]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleVideo = () => {
        if (localVideoRef.current?.srcObject) {
            const stream = localVideoRef.current.srcObject as MediaStream;
            stream.getVideoTracks().forEach(track => {
                track.enabled = !isVideoOn;
            });
        }
        setIsVideoOn(!isVideoOn);
    };

    const toggleAudio = () => {
        if (localVideoRef.current?.srcObject) {
            const stream = localVideoRef.current.srcObject as MediaStream;
            stream.getAudioTracks().forEach(track => {
                track.enabled = !isAudioOn;
            });
        }
        setIsAudioOn(!isAudioOn);
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
            await fetch(`${API_BASE_URL}/telemedicine/rooms/${roomId}/end/`, {
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
        <div className="relative h-[calc(100vh-100px)] w-full bg-black rounded-[32px] overflow-hidden shadow-2xl border border-border/20 group">

            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/80 z-10 pointer-events-none" />

            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex items-center gap-4">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-white/10">
                        <div className={cn(
                            "w-2.5 h-2.5 rounded-full",
                            connectionStatus === 'connected' ? "bg-green-500 animate-pulse" :
                                connectionStatus === 'connecting' ? "bg-yellow-500" : "bg-red-500"
                        )} />
                        <span className="text-white text-xs font-bold tracking-wide uppercase">
                            {connectionStatus === 'connected' ? 'Live Secure' : connectionStatus}
                        </span>
                        {connectionStatus === 'connected' && (
                            <span className="text-white/60 text-xs font-mono border-l border-white/20 pl-2 ml-1">
                                {formatDuration(callDuration)}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-white/20 text-white border border-white/10">
                        <Settings className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-white/20 text-white border border-white/10">
                        <Share2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Remote Video (Main) */}
            <div className="absolute inset-0 z-0">
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />

                {/* Fallback/Placeholder for Remote */}
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700">
                        <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center mb-6 border-4 border-zinc-700 shadow-xl relative">
                            <Users className="w-12 h-12 text-zinc-500" />
                            <div className="absolute -bottom-2 -right-2 bg-blue-500 p-2 rounded-full border-4 border-zinc-900">
                                <Video className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <h3 className="text-white text-xl font-bold tracking-tight mb-2">
                            {userRole === 'doctor' ? 'Waiting for patient...' : 'Connecting to doctor...'}
                        </h3>
                        <p className="text-zinc-500 text-sm">Secure connection established</p>
                    </div>
                </div>
            </div>

            {/* Local Video (PiP) */}
            <div className="absolute bottom-32 right-8 z-30 w-64 h-40 bg-zinc-900 rounded-[24px] overflow-hidden shadow-2xl border-2 border-white/10 hover:scale-105 transition-transform duration-300 ease-out cursor-pointer group/pip">
                <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn("w-full h-full object-cover", !isVideoOn && "hidden")}
                />
                {!isVideoOn && (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 text-zinc-500">
                        <VideoOff className="w-8 h-8 mb-2" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Camera Off</span>
                    </div>
                )}
                <div className="absolute top-2 right-2 opacity-0 group-hover/pip:opacity-100 transition-opacity">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
                </div>
            </div>

            {/* Controls Bar - Floating Glass */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xl border border-white/10 p-2 pl-3 pr-3 rounded-full shadow-2xl shadow-black/50 hover:bg-white/15 transition-colors duration-300">

                    <Button
                        onClick={toggleAudio}
                        variant="ghost"
                        className={cn(
                            "rounded-full w-12 h-12 transition-all duration-300",
                            !isAudioOn ? "bg-red-500/90 hover:bg-red-600 text-white shadow-lg shadow-red-500/20" : "bg-white/10 hover:bg-white/20 text-white"
                        )}
                    >
                        {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                    </Button>

                    <Button
                        onClick={toggleVideo}
                        variant="ghost"
                        className={cn(
                            "rounded-full w-12 h-12 transition-all duration-300",
                            !isVideoOn ? "bg-red-500/90 hover:bg-red-600 text-white shadow-lg shadow-red-500/20" : "bg-white/10 hover:bg-white/20 text-white"
                        )}
                    >
                        {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                    </Button>

                    <Button
                        onClick={() => setIsScreenSharing(!isScreenSharing)}
                        variant="ghost"
                        className={cn(
                            "rounded-full w-12 h-12 transition-all duration-300",
                            isScreenSharing ? "bg-blue-500/90 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-white/10 hover:bg-white/20 text-white"
                        )}
                    >
                        <Monitor className="w-5 h-5" />
                    </Button>

                    <div className="w-px h-8 bg-white/10 mx-1"></div>

                    <Button
                        variant="ghost"
                        className="rounded-full w-12 h-12 bg-white/10 hover:bg-white/20 text-white transition-all duration-300"
                    >
                        <MessageSquare className="w-5 h-5" />
                    </Button>

                    <Button
                        onClick={handleEndCall}
                        className="rounded-full w-14 h-12 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 hover:scale-105 transition-all duration-300 ml-1"
                    >
                        <PhoneOff className="w-6 h-6" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default VideoRoom;
