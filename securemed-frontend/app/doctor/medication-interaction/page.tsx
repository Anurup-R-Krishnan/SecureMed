'use client';

import React from 'react';
import { MedicationSandbox } from '@/components/features/pharmacy/interaction-sandbox';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Info, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function MedicationInteractionPage() {
    return (
        <div className="space-y-8 max-w-7xl mx-auto p-6 animate-in fade-in duration-500">
            {/* Zenith Header */}
            <div className="flex items-center justify-between border-b pb-6">
                <div className="flex items-center gap-6">
                    <Link href="/doctor/dashboard">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted transition-colors">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Pharmacology Analysis</h1>
                        <p className="text-muted-foreground mt-1 font-medium tracking-wide first-letter:uppercase">
                            Advanced Drug-Drug Interaction Simulator & Safety Check
                        </p>
                    </div>
                </div>
                <div>
                    <Button variant="outline" className="rounded-full px-6 font-bold border-2 hover:bg-muted/50 hidden md:flex">
                        <Printer className="h-4 w-4 mr-2" /> Print Report
                    </Button>
                </div>
            </div>

            {/* Disclaimer Card - Zenith Style */}
            <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-[24px] flex items-start gap-4 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full shrink-0 z-10">
                    <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="z-10">
                    <h4 className="text-lg font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                        Clinical Safety Protocol
                    </h4>
                    <p className="text-sm text-blue-800/80 dark:text-blue-200/80 mt-1 leading-relaxed max-w-3xl">
                        This simulation tool leverages standard pharmacological databases to predict potential interactions.
                        <span className="font-semibold block mt-1">
                            Results are for decision support only and must be verified by a certified pharmacist before clinical application.
                        </span>
                    </p>
                </div>
            </div>

            <div className="bg-card border rounded-[32px] shadow-sm p-1 overflow-hidden">
                <MedicationSandbox />
            </div>
        </div>
    );
}
