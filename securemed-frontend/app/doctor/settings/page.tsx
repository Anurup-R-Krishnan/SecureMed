'use client';

import React from 'react';
import MfaSetup from '@/components/auth/mfa-setup';

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-2xl font-black text-foreground mb-2">Security Settings</h3>
                <p className="text-muted-foreground font-medium">Manage your account security and two-factor authentication</p>
            </div>
            <MfaSetup />
        </div>
    );
}
