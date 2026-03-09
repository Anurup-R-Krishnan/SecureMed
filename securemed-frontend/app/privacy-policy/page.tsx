'use client';

import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
    return (
        <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl space-y-8">
                <Link href="/" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm font-medium">
                    <ArrowLeft className="h-4 w-4" /> Back to Home
                </Link>
                <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Shield className="h-6 w-6" /></div>
                        <h1 className="text-3xl font-black text-foreground">Privacy Policy</h1>
                    </div>
                    <div className="prose prose-sm text-muted-foreground leading-7 space-y-4">
                        <p>SecureMed Healthcare is committed to safeguarding your personal and medical data. This policy explains what data we collect, how we use it, and your rights under applicable healthcare privacy regulations.</p>
                        <h2 className="text-lg font-bold text-foreground">Data We Collect</h2>
                        <p>We collect information you provide when creating an account, booking appointments, or interacting with clinical services — including name, email, phone number, and medical records created during care.</p>
                        <h2 className="text-lg font-bold text-foreground">How We Use Data</h2>
                        <p>Your data is used solely for healthcare delivery, appointment management, lab-order processing, and clinical communications. We do not sell personal data.</p>
                        <h2 className="text-lg font-bold text-foreground">Security</h2>
                        <p>All data is encrypted in transit (TLS) and at rest. Access to medical records is role-based and audited. Emergency access is logged and time-limited.</p>
                        <h2 className="text-lg font-bold text-foreground">Your Rights</h2>
                        <p>You may request access to, correction of, or deletion of your data at any time through your patient portal or by contacting support.</p>
                        <p className="text-xs text-muted-foreground pt-4 border-t border-border">Last updated: March 2026</p>
                    </div>
                </div>
            </div>
        </main>
    );
}
