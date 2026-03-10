'use client';

import React from 'react';
import { Mic, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceOverlayProps {
    isActive: boolean;
    isProcessing: boolean;
    transcript: string;
    onClose: () => void;
}

export function VoiceOverlay({ isActive, isProcessing, transcript, onClose }: VoiceOverlayProps) {
    return (
        <AnimatePresence>
            {isActive && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl"
                >
                    <div className="relative w-full max-w-2xl px-6 text-center">
                        <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                            onClick={onClose}
                            className="absolute -top-16 right-6 p-3 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </motion.button>

                        <div className="flex flex-col items-center gap-12">
                            {/* Listening Animation */}
                            <div className="relative">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.5, 1],
                                        opacity: [0.5, 0.2, 0.5],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }}
                                    className="absolute inset-0 bg-primary/20 rounded-full blur-3xl"
                                />
                                <motion.div
                                    animate={isProcessing ? { rotate: 360 } : {}}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className={`relative z-10 flex h-32 w-32 items-center justify-center rounded-full border-4 ${
                                        isProcessing ? 'border-primary border-t-transparent' : 'border-primary'
                                    } bg-background shadow-2xl`}
                                >
                                    <Mic className={`h-12 w-12 ${isProcessing ? 'animate-pulse text-muted-foreground' : 'text-primary'}`} />
                                </motion.div>
                            </div>

                            <div className="space-y-6">
                                <motion.h2
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="text-4xl font-black tracking-tight text-foreground"
                                >
                                    {isProcessing ? 'Analyzing...' : 'I\'m Listening'}
                                </motion.h2>

                                <div className="min-h-[60px]">
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-xl font-medium text-muted-foreground italic"
                                    >
                                        {transcript || 'Try saying "Go to Billing" or "Book an appointment with Dr. Smith"'}
                                    </motion.p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                <span className="text-xs font-black text-primary uppercase tracking-widest">Voice Mode Active</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
