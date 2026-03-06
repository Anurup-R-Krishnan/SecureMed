'use client';

import React from 'react';
import { AlertOctagon, X } from 'lucide-react';

interface CriticalAlertBannerProps {
    alerts?: {
        id: string;
        message: string;
        type: 'critical' | 'warning';
    }[];
}

export function CriticalAlertBanner({ alerts = [] }: CriticalAlertBannerProps) {
    if (alerts.length === 0) return null;

    return (
        <div className="w-full flex flex-col z-50 sticky top-0">
            {alerts.map((alert) => (
                <div
                    key={alert.id}
                    className={`
            w-full px-4 py-2 flex items-center justify-between text-white text-sm font-bold shadow-md animate-in slide-in-from-top duration-300
            ${alert.type === 'critical' ? 'bg-red-600' : 'bg-orange-500'}
          `}
                >
                    <div className="flex items-center gap-3 container max-w-7xl mx-auto">
                        <AlertOctagon className="h-5 w-5 animate-pulse" />
                        <span className="uppercase tracking-wider">{alert.message}</span>
                    </div>
                    <button className="p-1 hover:bg-white/20 rounded-full transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
