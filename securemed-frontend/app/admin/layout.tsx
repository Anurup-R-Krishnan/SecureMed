'use client';

import React from 'react';
import { TopNavigation } from '@/components/layout/top-navigation';
import { CriticalAlertBanner } from '@/components/ui/critical-alert-banner';
import { CommandPalette } from '@/components/ui/command-palette';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <CriticalAlertBanner />
            <TopNavigation userType="admin" />

            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                {children}
            </main>

            <CommandPalette />
        </div>
    );
}
