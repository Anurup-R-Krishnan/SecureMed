'use client';

import React from 'react';
import { Syringe, Truck, FlaskConical, Microscope, FileCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const STEPS = [
    { id: 'ordered', label: 'Ordered', icon: FileCheck },
    { id: 'collection', label: 'Phlebotomy', icon: Syringe },
    { id: 'transit', label: 'In Transit', icon: Truck },
    { id: 'processing', label: 'Processing', icon: FlaskConical },
    { id: 'analyzing', label: 'Analyzer', icon: Microscope },
    { id: 'result', label: 'Result Ready', icon: FileCheck }, // Re-using FileCheck for result
];

interface LabTrackerProps {
    currentStepIndex: number; // 0 to 5
    testName: string;
}

export function LabTubeTracker({ currentStepIndex = 2, testName = "CBC w/ Diff" }: LabTrackerProps) {
    return (
        <div className="w-full bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h4 className="font-bold text-lg">{testName}</h4>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Order #L-99283</p>
                </div>
                <div className="text-right">
                    <div className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full animate-pulse">
                        EST: 15 mins
                    </div>
                </div>
            </div>

            <div className="relative flex justify-between items-center">
                {/* Background Line */}
                <div className="absolute left-0 right-0 top-1/2 h-1 bg-muted -z-10 rounded-full" />

                {/* Progress Line */}
                <motion.div
                    className="absolute left-0 top-1/2 h-1 bg-primary -z-0 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                />

                {/* Steps */}
                {STEPS.map((step, index) => {
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    const Icon = step.icon;

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-3 relative group">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0.5 }}
                                animate={{
                                    scale: isCurrent ? 1.2 : 1,
                                    opacity: isCompleted ? 1 : 0.4,
                                    backgroundColor: isCompleted ? 'var(--primary)' : 'var(--background)',
                                    borderColor: isCompleted ? 'var(--primary)' : 'var(--muted)'
                                }}
                                className={`
                       w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 transition-colors duration-300
                       ${isCompleted ? 'text-primary-foreground shadow-lg shadow-primary/30' : 'bg-background text-muted-foreground'}
                    `}
                            >
                                <Icon className="h-5 w-5" />
                            </motion.div>

                            <div className={`
                     text-xs font-bold whitespace-nowrap absolute -bottom-8
                     ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}
                  `}>
                                {step.label}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
