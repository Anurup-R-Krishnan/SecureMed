'use client';

import React from 'react';
import { MessagingInterface } from '@/components/telemedicine/MessagingInterface';

export default function MessagingPage() {
    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-black text-foreground tracking-tight">Messages</h3>
            <p className="text-muted-foreground">Secure communication with your healthcare providers</p>
            <MessagingInterface />
        </div>
    );
}
