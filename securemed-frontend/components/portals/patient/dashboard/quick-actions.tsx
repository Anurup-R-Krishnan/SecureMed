'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarPlus, Pill, MessageSquareMore, FileText } from 'lucide-react';

interface QuickActionsProps {
    onNavigate: (tab: any) => void;
}

export default function QuickActions({ onNavigate }: QuickActionsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
                variant="ghost"
                className="h-auto py-4 flex flex-col items-center gap-3 bg-white/5 border border-white/10 hover:bg-blue-500/10 hover:border-blue-500/20 transition-all group"
                onClick={() => onNavigate('appointments')}
            >
                <div className="p-3 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-colors">
                    <CalendarPlus className="h-6 w-6 text-blue-500" />
                </div>
                <span className="font-medium text-sm">Book Appointment</span>
            </Button>

            <Button
                variant="ghost"
                className="h-auto py-4 flex flex-col items-center gap-3 bg-white/5 border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all group"
                onClick={() => onNavigate('medical-records')}
            >
                <div className="p-3 bg-emerald-500/10 rounded-full group-hover:bg-emerald-500/20 transition-colors">
                    <Pill className="h-6 w-6 text-emerald-500" />
                </div>
                <span className="font-medium text-sm">Renew Prescription</span>
            </Button>

            <Button
                variant="ghost"
                className="h-auto py-4 flex flex-col items-center gap-3 bg-white/5 border border-white/10 hover:bg-purple-500/10 hover:border-purple-500/20 transition-all group"
                onClick={() => onNavigate('telemedicine')}
            >
                <div className="p-3 bg-purple-500/10 rounded-full group-hover:bg-purple-500/20 transition-colors">
                    <MessageSquareMore className="h-6 w-6 text-purple-500" />
                </div>
                <span className="font-medium text-sm">Message Doctor</span>
            </Button>

            <Button
                variant="ghost"
                className="h-auto py-4 flex flex-col items-center gap-3 bg-white/5 border border-white/10 hover:bg-amber-500/10 hover:border-amber-500/20 transition-all group"
                onClick={() => onNavigate('billing')}
            >
                <div className="p-3 bg-amber-500/10 rounded-full group-hover:bg-amber-500/20 transition-colors">
                    <FileText className="h-6 w-6 text-amber-500" />
                </div>
                <span className="font-medium text-sm">View Bills</span>
            </Button>
        </div>
    );
}
