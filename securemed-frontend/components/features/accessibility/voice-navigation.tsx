'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { VoiceOverlay } from '@/components/ui/voice-overlay';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

// Define SpeechRecognition types for TS
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: any) => void;
    onend: () => void;
    onstart: () => void;
}

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export function VoiceNavigation() {
    const [isActive, setIsActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const isStartedRef = useRef(false);
    const processingRef = useRef(false);
    
    const router = useRouter();
    const { toast } = useToast();

    const handleIntentResult = useCallback((result: any) => {
        const { intent, data, feedback } = result;

        toast({
            title: intent === 'ERROR' ? "Wait..." : "Voice Command",
            description: feedback,
        });

        if (intent === 'NAVIGATE') {
            router.push(data.url);
            setIsActive(false);
        } else if (intent === 'BOOK_APPOINTMENT') {
            router.push(`/patient/appointments?bookingIntent=${encodeURIComponent(JSON.stringify(data))}`);
            setIsActive(false);
        } else if (intent === 'ERROR') {
            setTimeout(() => setIsActive(false), 3000);
        } else {
            setIsActive(false);
        }
    }, [router, toast]);

    const processIntent = useCallback(async (text: string) => {
        setIsProcessing(true);
        processingRef.current = true;
        
        try {
            const response = await api.post('/platform/voice/intent/', { text });
            handleIntentResult(response.data);
        } catch (error) {
            console.error('Voice processing error:', error);
            toast({
                title: "Voice Error",
                description: "I couldn't process your request. Please try again.",
                variant: "destructive"
            });
            setIsActive(false);
        } finally {
            setIsProcessing(false);
            processingRef.current = false;
        }
    }, [handleIntentResult, toast]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition && !recognitionRef.current) {
            const recognitionInstance = new SpeechRecognition();
            recognitionInstance.continuous = false;
            recognitionInstance.interimResults = true;
            recognitionInstance.lang = 'en-US';

            recognitionInstance.onstart = () => {
                isStartedRef.current = true;
            };

            recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
                const current = event.results[0][0].transcript;
                setTranscript(current);

                if (event.results[0].isFinal) {
                    recognitionInstance.stop();
                    processIntent(current);
                }
            };

            recognitionInstance.onerror = (event: any) => {
                if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    console.error('Speech recognition error', event.error);
                }
                isStartedRef.current = false;
                if (!processingRef.current) {
                    setIsActive(false);
                }
            };

            recognitionInstance.onend = () => {
                isStartedRef.current = false;
                if (!processingRef.current) {
                    setIsActive(false);
                }
            };

            recognitionRef.current = recognitionInstance;
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [processIntent]);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isStartedRef.current && !processingRef.current) {
            setTranscript('');
            setIsActive(true);
            try {
                recognitionRef.current.start();
            } catch (err) {
                console.error('Failed to start recognition:', err);
                setIsActive(false);
            }
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && (e.target === document.body || e.target === document.documentElement)) {
                if (!isActive && !isProcessing) {
                    e.preventDefault();
                    startListening();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isActive, isProcessing, startListening]);

    return (
        <VoiceOverlay
            isActive={isActive}
            isProcessing={isProcessing}
            transcript={transcript}
            onClose={() => {
                if (recognitionRef.current) recognitionRef.current.abort();
                setIsActive(false);
            }}
        />
    );
}
