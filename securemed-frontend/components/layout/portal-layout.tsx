'use client';

import React from 'react';
import { TopNavigation } from '@/components/layout/top-navigation';
import { CommandPalette } from '@/components/ui/command-palette';
import { CriticalAlertBanner } from '@/components/ui/critical-alert-banner';
import { MobileNav } from '@/components/layout/mobile-nav';
import RoleGuard from '@/components/auth/role-guard';

interface PortalLayoutProps {
    children: React.ReactNode;
    userType: string;
    allowedRoles?: string[];
    showCriticalAlert?: boolean;
    showMobileNav?: boolean;
    extraWidgets?: React.ReactNode;
}

export function PortalLayout({
    children,
    userType,
    allowedRoles,
    showCriticalAlert = false,
    showMobileNav = false,
    extraWidgets,
}: PortalLayoutProps) {
    const content = (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {showCriticalAlert && <CriticalAlertBanner />}
            <TopNavigation userType={userType as any} />

            <main className={`flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6 ${showMobileNav ? 'pb-24 md:pb-6' : ''}`}>
                {children}
            </main>

            {showMobileNav && <MobileNav />}
            <CommandPalette />
            {extraWidgets}
        </div>
    );

    if (allowedRoles && allowedRoles.length > 0) {
        return <RoleGuard allowedRoles={allowedRoles}>{content}</RoleGuard>;
    }

    return content;
}
