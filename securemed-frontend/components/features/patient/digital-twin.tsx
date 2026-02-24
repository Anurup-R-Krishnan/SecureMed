'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertCircle, X } from 'lucide-react';

// Types for body parts and their status
export type BodyPartId = 'head' | 'chest' | 'abdomen' | 'left-arm' | 'right-arm' | 'left-leg' | 'right-leg';

export interface BodyPartStatus {
    id: BodyPartId;
    label: string;
    status: 'normal' | 'warning' | 'critical';
    details?: string;
    vitals?: { label: string; value: string }[];
}

export interface DigitalTwinProps {
    patientStatus?: Record<string, BodyPartStatus>;
    patientId?: string;
}

export function DigitalTwin({ patientStatus, patientId = 'PT-8492' }: DigitalTwinProps) {
    const [selectedPart, setSelectedPart] = useState<BodyPartId | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(patientId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getStatusColor = (partId: BodyPartId) => {
        if (!patientStatus) return 'fill-muted/10 stroke-muted-foreground/20';

        const status = patientStatus[partId]?.status;
        if (status === 'critical') return 'fill-red-500/50 stroke-red-600';
        if (status === 'warning') return 'fill-orange-400/50 stroke-orange-500';
        return 'fill-muted/20 stroke-muted-foreground/30 hover:fill-primary/20 hover:stroke-primary';
    };

    return (
        <div className="flex flex-col md:flex-row gap-8 h-[500px] w-full bg-card rounded-xl border p-6 relative overflow-hidden">

            {/* Header */}
            <div className="absolute top-6 left-6 z-10">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Digital Twin
                </h3>
                <button
                    onClick={handleCopy}
                    className="group flex items-center gap-1.5 text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors mt-1"
                >
                    <span>ID: {patientId}</span>
                    {copied ? (
                        <span className="text-emerald-500 font-bold">Copied!</span>
                    ) : (
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">Copy</span>
                    )}
                </button>
                {!patientStatus && (
                    <span className="text-xs text-muted-foreground italic mt-2 block">(No live data connected)</span>
                )}
            </div>

            {/* Body Map Visualization (Center) */}
            <div className="flex-1 flex items-center justify-center relative">
                <svg
                    viewBox="0 0 200 400"
                    className="h-full max-h-[450px] w-auto drop-shadow-xl"
                >
                    {/* Head */}
                    <path
                        d="M100,50 m-25,0 a25,25 0 1,0 50,0 a25,25 0 1,0 -50,0" // Simplified Head
                        className={`cursor-pointer transition-all duration-300 stroke-2 ${getStatusColor('head')} ${selectedPart === 'head' ? 'scale-110' : ''}`}
                        onClick={() => setSelectedPart('head')}
                    />

                    {/* Chest */}
                    <path
                        d="M70,80 L130,80 L125,140 L75,140 Z" // Simplified Chest
                        className={`cursor-pointer transition-all duration-300 stroke-2 ${getStatusColor('chest')} ${selectedPart === 'chest' ? 'scale-105 origin-center' : ''}`}
                        onClick={() => setSelectedPart('chest')}
                    />

                    {/* Abdomen */}
                    <path
                        d="M75,140 L125,140 L120,190 L80,190 Z" // Simplified Abdomen
                        className={`cursor-pointer transition-all duration-300 stroke-2 ${getStatusColor('abdomen')} ${selectedPart === 'abdomen' ? 'scale-105 origin-center' : ''}`}
                        onClick={() => setSelectedPart('abdomen')}
                    />

                    {/* Arms (Lines for abstract look) */}
                    <line x1="70" y1="85" x2="40" y2="150" className="stroke-muted-foreground/30 stroke-4 hover:stroke-primary cursor-pointer" onClick={() => setSelectedPart('left-arm')} />
                    <line x1="130" y1="85" x2="160" y2="150" className="stroke-muted-foreground/30 stroke-4 hover:stroke-primary cursor-pointer" onClick={() => setSelectedPart('right-arm')} />

                    {/* Legs (Lines for abstract look) */}
                    <line x1="85" y1="190" x2="80" y2="300" className="stroke-muted-foreground/30 stroke-4 hover:stroke-primary cursor-pointer" onClick={() => setSelectedPart('left-leg')} />
                    <line x1="115" y1="190" x2="120" y2="300" className="stroke-muted-foreground/30 stroke-4 hover:stroke-primary cursor-pointer" onClick={() => setSelectedPart('right-leg')} />

                    {/* Critical Pulse Rings (Visual Flair) */}
                    {patientStatus && patientStatus['chest']?.status === 'critical' && (
                        <circle cx="100" cy="110" r="10" className="fill-red-500 animate-ping opacity-75" />
                    )}
                </svg>

                {/* Legend / Status Indicators in corners */}
                <div className="absolute bottom-0 right-0 p-2 flex flex-col gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Critical</div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-400"></div> Warning</div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300"></div> Stable</div>
                </div>
            </div>

            {/* Data Panel (Right Side - Conditionally Rendered) */}
            <AnimatePresence mode='wait'>
                {selectedPart && patientStatus && patientStatus[selectedPart] ? (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="w-full md:w-80 h-full bg-muted/30 rounded-lg p-4 border-l overflow-y-auto"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-lg">{patientStatus[selectedPart].label}</h4>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase ${patientStatus[selectedPart].status === 'critical' ? 'bg-red-100 text-red-700' :
                                    patientStatus[selectedPart].status === 'warning' ? 'bg-orange-100 text-orange-700' :
                                        'bg-green-100 text-green-700'
                                    }`}>
                                    {patientStatus[selectedPart].status}
                                </span>
                            </div>
                            <button onClick={() => setSelectedPart(null)} className="hover:bg-muted p-1 rounded-full">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-background p-3 rounded-md shadow-sm border">
                                <p className="text-sm text-foreground">{patientStatus[selectedPart].details || 'No specific details reported.'}</p>
                            </div>

                            {patientStatus[selectedPart].vitals && (
                                <div>
                                    <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Live Vitals</h5>
                                    <div className="grid grid-cols-2 gap-2">
                                        {patientStatus[selectedPart].vitals!.map((vital, i) => (
                                            <div key={i} className="bg-background p-2 rounded border text-center">
                                                <div className="text-xs text-muted-foreground">{vital.label}</div>
                                                <div className="font-mono font-bold text-lg">{vital.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t">
                                <button className="w-full py-2 bg-primary/10 text-primary rounded-md text-sm font-bold hover:bg-primary/20 transition-colors">
                                    View Related Labs
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="hidden md:flex w-80 h-full items-center justify-center text-muted-foreground text-sm text-center p-6 border-l border-dashed">
                        <div className="flex flex-col items-center gap-2">
                            <AlertCircle className="h-8 w-8 opacity-20" />
                            <p>Select a body region to view detailed status.</p>
                        </div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
