'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ResetStep = 'REQUEST' | 'SUCCESS' | 'ERROR';

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<ResetStep>('REQUEST');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage('');

        try {
            const response = await fetch('http://localhost:8000/api/auth/password-reset/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                setStep('SUCCESS');
            } else {
                const data = await response.json();
                // Still show success to prevent email enumeration
                // Backend should always return 200 for security
                setStep('SUCCESS');
            }
        } catch (error) {
            // Show success anyway to prevent email enumeration attacks
            setStep('SUCCESS');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="font-medium">Back to Home</span>
                    </Link>
                </div>
            </div>

            {/* Content */}
            <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
                <div className="w-full max-w-md">
                    {step === 'REQUEST' && (
                        <div className="rounded-2xl border border-border bg-card p-8">
                            <h2 className="text-2xl font-bold text-foreground mb-2">
                                Reset Password
                            </h2>
                            <p className="text-muted-foreground mb-6">
                                Enter your email address and we&apos;ll send you instructions to reset your password.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            className="w-full rounded-lg border border-border bg-background px-10 py-2.5 text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    size="lg"
                                    disabled={isLoading || !email}
                                >
                                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                                </Button>
                            </form>

                            <p className="mt-6 text-center text-sm text-muted-foreground">
                                Remember your password?{' '}
                                <Link href="/" className="font-semibold text-primary hover:underline">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    )}

                    {step === 'SUCCESS' && (
                        <div className="rounded-2xl border border-border bg-card p-8 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground mb-2">
                                Check Your Email
                            </h2>
                            <p className="text-muted-foreground mb-6">
                                If an account exists for <strong>{email}</strong>, we&apos;ve sent password reset instructions to that address.
                            </p>
                            <p className="text-sm text-muted-foreground mb-6">
                                Didn&apos;t receive an email? Check your spam folder or try again with a different address.
                            </p>
                            <div className="space-y-3">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        setStep('REQUEST');
                                        setEmail('');
                                    }}
                                >
                                    Try Another Email
                                </Button>
                                <Link href="/">
                                    <Button className="w-full">
                                        Back to Sign In
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    )}

                    {step === 'ERROR' && (
                        <div className="rounded-2xl border border-destructive/50 bg-card p-8 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                                <AlertCircle className="h-8 w-8 text-destructive" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground mb-2">
                                Something Went Wrong
                            </h2>
                            <p className="text-muted-foreground mb-6">
                                {errorMessage || 'We couldn\'t process your request. Please try again later.'}
                            </p>
                            <Button
                                className="w-full"
                                onClick={() => setStep('REQUEST')}
                            >
                                Try Again
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
