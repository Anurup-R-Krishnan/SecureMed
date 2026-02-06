import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle } from 'lucide-react';

interface TermsOfServiceModalProps {
    isOpen: boolean;
    onAccept: () => void;
    token: string | null;
}

export function TermsOfServiceModal({ isOpen, onAccept, token }: TermsOfServiceModalProps) {
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        // Check if scrolled to bottom (with small buffer)
        if (Math.abs(scrollHeight - clientHeight - scrollTop) < 20) {
            setHasScrolledToBottom(true);
        }
    };

    const handleAccept = async () => {
        if (!token) return;

        setIsLoading(true);
        try {
            await axios.post(
                'http://localhost:8000/api/auth/accept-policy/',
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            toast({
                title: 'Terms Accepted',
                description: 'You have successfully accepted the updated policies.',
                variant: 'default',
            });

            onAccept();

        } catch (error: any) {
            console.error('Failed to accept terms:', error);
            toast({
                title: 'Error',
                description: 'Failed to accept terms. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="w-full max-w-2xl bg-card rounded-xl shadow-2xl overflow-hidden border border-border animate-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="p-6 border-b border-border bg-muted/30 flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                        <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">
                            Terms of Service Update
                        </h2>
                        <p className="text-muted-foreground text-sm mt-1">
                            Please review and accept our updated terms to continue using SecureMed.
                        </p>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div
                    className="h-[400px] overflow-y-auto p-6 space-y-4 text-sm text-foreground/80 leading-relaxed bg-background"
                    onScroll={handleScroll}
                >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <h3 className="font-bold text-lg text-foreground mt-0">1. Privacy Policy & Data Protection</h3>
                        <p>
                            SecureMed is committed to protecting your personal health information. We comply with HIPAA (Health Insurance Portability and Accountability Act) and GDPR (General Data Protection Regulation) standards to ensure your data is secure, confidential, and handled with the utmost care.
                        </p>

                        <h3 className="font-bold text-lg text-foreground">2. Data Collection & Usage</h3>
                        <p>
                            We collect only the minimum necessary information required to provide our medical portal services. This includes your account credentials, basic profile information, and secure logs of your interactions with the platform. Your data is encrypted at rest and in transit.
                        </p>

                        <h3 className="font-bold text-lg text-foreground">3. Right to be Forgotten</h3>
                        <p>
                            In accordance with modern privacy laws (Story 2.3), you have the right to request the deletion of your account and associated data. Upon request, your account will be immediately deactivated and scheduled for permanent deletion after a 30-day grace period. You may download a deletion certificate for your records.
                        </p>

                        <h3 className="font-bold text-lg text-foreground">4. Security Responsibilities</h3>
                        <p>
                            You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account. SecureMed employs Multi-Factor Authentication (MFA) to further protect your account.
                        </p>

                        <h3 className="font-bold text-lg text-foreground">5. Policy Updates</h3>
                        <p>
                            We may update these terms from time to time to reflect changes in our practices or legal requirements. You will be notified of any significant changes and required to accept the updated terms to continue accessing the platform.
                        </p>

                        <h3 className="font-bold text-lg text-foreground">6. Consent to Electronic Communications</h3>
                        <p>
                            By using generic medical services provided by SecureMed, you consent to receive electronic communications from us regarding your account, security updates, and other relevant information.
                        </p>

                        <div className="h-4" /> {/* Spacer at bottom */}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-muted/30 flex justify-between items-center gap-4">
                    <div className="text-sm text-muted-foreground italic flex items-center gap-2">
                        {!hasScrolledToBottom ? (
                            <span>Please scroll to the bottom to accept</span>
                        ) : (
                            <span className="text-green-500 flex items-center gap-1 font-medium">
                                <CheckCircle className="h-4 w-4" /> You can now accept the terms
                            </span>
                        )}
                    </div>
                    <Button
                        onClick={handleAccept}
                        disabled={!hasScrolledToBottom || isLoading}
                        size="lg"
                        className={`min-w-[200px] transition-all duration-300 ${hasScrolledToBottom ? 'bg-primary hover:bg-primary/90' : 'opacity-50 cursor-not-allowed'
                            }`}
                    >
                        {isLoading ? 'Accepting...' : 'I Agree to the Updated Terms'}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}
