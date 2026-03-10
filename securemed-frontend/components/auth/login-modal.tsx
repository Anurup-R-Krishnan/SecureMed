'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowRight, Lock, Mail, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PulseSpinner } from '@/components/ui/spinner';
import { getPortalRouteForRole } from '@/lib/routes';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    redirectTo?: string | null;
}

function getSafeRedirect(redirectTo?: string | null) {
    if (!redirectTo) return null;
    if (!redirectTo.startsWith('/')) return null;
    if (redirectTo.startsWith('//')) return null;
    return redirectTo;
}

export default function LoginModal({ isOpen, onClose, redirectTo }: LoginModalProps) {
    const router = useRouter();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await login(email, password);

            if (result.status === 'SUCCESS' && result.user) {
                const target = getSafeRedirect(redirectTo) || getPortalRouteForRole(result.user.role);
                router.replace(target);
                // Fallback for environments where the client router stalls (e.g., CI/E2E).
                window.setTimeout(() => {
                    if (window.location.pathname.startsWith('/login')) {
                        window.location.assign(target);
                    }
                }, 500);
            } else {
                setError(result.error || 'Invalid credentials. Please try again.');
            }
        } catch (err: any) {
            console.error("Login failed", err);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegisterClick = () => {
        onClose();
        const registerUrl = redirectTo ? `/register?next=${encodeURIComponent(redirectTo)}` : '/register';
        router.push(registerUrl);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-background/80 backdrop-blur-2xl border-border/50 rounded-[32px] shadow-2xl gap-0">
                <div className="relative p-8 pb-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-primary/10 p-2.5 rounded-xl ring-1 ring-primary/20">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                                SecureMed
                            </DialogTitle>
                            <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                Access Portal
                            </DialogDescription>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                            <p className="text-sm font-medium text-destructive">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email / Username</Label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="doctor@hospital.org"
                                    className="pl-10 h-12 rounded-xl bg-muted/30 border-transparent focus:border-primary/30 focus:bg-background transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="password">Password</Label>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                                    type="button"
                                    onClick={() => { onClose(); router.push('/forgot-password'); }}
                                >
                                    Forgot password?
                                </Button>
                            </div>
                            <div className="relative">
                                <PasswordInput
                                    id="password"
                                    placeholder="••••••••"
                                    className="h-12 rounded-xl bg-muted/30 border-transparent focus:border-primary/30 focus:bg-background transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    showIcon={true}
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 rounded-xl font-bold text-md shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all mt-4"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    Sign In securely
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>
                </div>

                <div className="p-6 bg-muted/30 mt-8 border-t border-border/50 text-center">
                    <p className="text-sm text-muted-foreground">
                        Don&apos;t have an account?{' '}
                        <button
                            onClick={handleRegisterClick}
                            className="font-bold text-primary hover:underline hover:text-primary/80 transition-colors"
                        >
                            Register
                        </button>
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
