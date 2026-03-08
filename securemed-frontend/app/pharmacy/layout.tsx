'use client';

import React from 'react';
import { TopNavigation } from '@/components/layout/top-navigation';
import { CommandPalette } from '@/components/ui/command-palette';

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <TopNavigation userType="pharmacist" />

            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                {children}
            </main>

            <CommandPalette />
        </div>
    );
}
