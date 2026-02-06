'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ShieldCheck, ShieldOff, Key, Download, Copy, Check, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';

type MFAState = 'IDLE' | 'SETUP' | 'VERIFY' | 'ACTIVE';

export default function SecuritySettingsPage() {
    const router = useRouter();
    const { user, refreshUserStatus } = useAuth();
    const [mfaState, setMfaState] = useState<MFAState>('IDLE');
    const [isLoading, setIsLoading] = useState(false);

    // MFA Setup State
    const [secret, setSecret] = useState('');
    const [otpauthUrl, setOtpauthUrl] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [copied, setCopied] = useState(false);

    // Recovery Codes State
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
    const [codesCopied, setCodesCopied] = useState(false);

    // Deactivation State
    const [isDeactivating, setIsDeactivating] = useState(false);
    const [deactivatePassword, setDeactivatePassword] = useState('');
    const [deactivateOtp, setDeactivateOtp] = useState('');

    // Regeneration State
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [regeneratePassword, setRegeneratePassword] = useState('');

    // Sync MFA state with user
    useEffect(() => {
        if (user?.mfa_enabled) {
            setMfaState('ACTIVE');
        } else {
            setMfaState('IDLE');
        }
    }, [user?.mfa_enabled]);

    // Check authentication
    useEffect(() => {
        if (!user) {
            router.push('/');
        }
    }, [user, router]);

    const handleStartSetup = async () => {
        setIsLoading(true);

        try {
            const authTokens = localStorage.getItem('auth_tokens');
            if (!authTokens) {
                toast.error('You must be logged in to enable MFA');
                setIsLoading(false);
                return;
            }

            const tokens = JSON.parse(authTokens);
            const accessToken = tokens.access;

            const response = await fetch('http://localhost:8000/api/auth/mfa/setup/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || 'Failed to start MFA setup');
                setIsLoading(false);
                return;
            }

            setSecret(data.secret);
            setOtpauthUrl(data.otpauth_url);
            setMfaState('SETUP');
            toast.success('Scan the QR code with your authenticator app');

        } catch (error) {
            console.error('MFA setup error:', error);
            toast.error('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();

        if (verificationCode.length !== 6) {
            toast.error('Please enter a 6-digit code');
            return;
        }

        setIsLoading(true);

        try {
            const authTokens = localStorage.getItem('auth_tokens');
            if (!authTokens) {
                toast.error('You must be logged in');
                setIsLoading(false);
                return;
            }

            const tokens = JSON.parse(authTokens);
            const accessToken = tokens.access;

            const response = await fetch('http://localhost:8000/api/auth/mfa/verify/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ otp: verificationCode }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || 'Invalid verification code');
                setIsLoading(false);
                return;
            }

            // MFA enabled successfully - show recovery codes
            if (data.recovery_codes && data.recovery_codes.length > 0) {
                setRecoveryCodes(data.recovery_codes);
                setShowRecoveryCodes(true);
            }

            await refreshUserStatus();
            setMfaState('ACTIVE');
            toast.success('Two-Factor Authentication enabled successfully!');
            setVerificationCode('');

        } catch (error) {
            console.error('MFA verification error:', error);
            toast.error('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeactivate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!deactivatePassword || deactivateOtp.length !== 6) {
            toast.error('Please provide both password and 6-digit OTP code');
            return;
        }

        setIsLoading(true);

        try {
            const authTokens = localStorage.getItem('auth_tokens');
            if (!authTokens) {
                toast.error('You must be logged in');
                setIsLoading(false);
                return;
            }

            const tokens = JSON.parse(authTokens);
            const accessToken = tokens.access;

            const response = await fetch('http://localhost:8000/api/auth/mfa/deactivate/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    password: deactivatePassword,
                    otp: deactivateOtp
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || data.password?.[0] || 'Failed to deactivate MFA');
                setIsLoading(false);
                return;
            }

            await refreshUserStatus();
            setMfaState('IDLE');
            setIsDeactivating(false);
            setDeactivatePassword('');
            setDeactivateOtp('');
            setRecoveryCodes([]);
            setShowRecoveryCodes(false);
            toast.success('Two-Factor Authentication deactivated');

        } catch (error) {
            console.error('MFA deactivation error:', error);
            toast.error('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegenerateCodes = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!regeneratePassword) {
            toast.error('Please enter your password');
            return;
        }

        setIsLoading(true);

        try {
            const authTokens = localStorage.getItem('auth_tokens');
            if (!authTokens) {
                toast.error('You must be logged in');
                setIsLoading(false);
                return;
            }

            const tokens = JSON.parse(authTokens);
            const accessToken = tokens.access;

            const response = await fetch('http://localhost:8000/api/auth/mfa/recovery-codes/regenerate/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ password: regeneratePassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || data.password?.[0] || 'Failed to regenerate codes');
                setIsLoading(false);
                return;
            }

            setRecoveryCodes(data.recovery_codes);
            setShowRecoveryCodes(true);
            setIsRegenerating(false);
            setRegeneratePassword('');
            toast.success('Recovery codes regenerated successfully');

        } catch (error) {
            console.error('Recovery code regeneration error:', error);
            toast.error('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const copySecret = () => {
        navigator.clipboard.writeText(secret);
        setCopied(true);
        toast.success('Secret key copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const copyAllCodes = () => {
        const codesText = recoveryCodes.join('\n');
        navigator.clipboard.writeText(codesText);
        setCodesCopied(true);
        toast.success('Recovery codes copied to clipboard');
        setTimeout(() => setCodesCopied(false), 2000);
    };

    const downloadCodes = () => {
        const codesText = `SecureMed MFA Recovery Codes\nGenerated: ${new Date().toLocaleString()}\n\n${recoveryCodes.join('\n')}\n\nIMPORTANT: Keep these codes safe. Each code can only be used once.`;
        const blob = new Blob([codesText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `securemed-recovery-codes-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Recovery codes downloaded');
    };

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">Security Settings</h1>
                    <p className="text-muted-foreground">Manage your account security and two-factor authentication</p>
                </div>

                {/* MFA Status Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {mfaState === 'ACTIVE' ? (
                                    <div className="rounded-full bg-green-500/10 p-3">
                                        <ShieldCheck className="h-6 w-6 text-green-500" />
                                    </div>
                                ) : (
                                    <div className="rounded-full bg-muted p-3">
                                        <Shield className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                )}
                                <div>
                                    <CardTitle>Two-Factor Authentication</CardTitle>
                                    <CardDescription>Add an extra layer of security to your account</CardDescription>
                                </div>
                            </div>
                            <Badge variant={mfaState === 'ACTIVE' ? 'default' : 'secondary'} className={mfaState === 'ACTIVE' ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}>
                                {mfaState === 'ACTIVE' ? 'Enabled' : 'Disabled'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* IDLE State - Enable MFA */}
                        {mfaState === 'IDLE' && (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Two-factor authentication adds an extra layer of security by requiring a verification code from your phone in addition to your password.
                                </p>
                                <Button onClick={handleStartSetup} disabled={isLoading}>
                                    <Shield className="h-4 w-4 mr-2" />
                                    {isLoading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
                                </Button>
                            </div>
                        )}

                        {/* SETUP State - Show QR Code */}
                        {mfaState === 'SETUP' && (
                            <div className="space-y-6">
                                <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                                    <h3 className="font-semibold text-foreground">Step 1: Scan QR Code</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                                    </p>
                                    <div className="flex justify-center bg-white p-4 rounded-lg">
                                        <QRCodeSVG value={otpauthUrl} size={200} />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-foreground">Or enter this key manually:</p>
                                        <div className="flex gap-2">
                                            <Input
                                                value={secret}
                                                readOnly
                                                className="font-mono text-sm"
                                            />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={copySecret}
                                            >
                                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handleVerify} className="space-y-4">
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-foreground">Step 2: Verify Code</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Enter the 6-digit code from your authenticator app
                                        </p>
                                        <Input
                                            type="text"
                                            placeholder="000000"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            className="text-center text-lg font-mono tracking-widest"
                                            maxLength={6}
                                            disabled={isLoading}
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="submit" disabled={isLoading || verificationCode.length !== 6}>
                                            {isLoading ? 'Verifying...' : 'Verify and Enable'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setMfaState('IDLE');
                                                setSecret('');
                                                setOtpauthUrl('');
                                                setVerificationCode('');
                                            }}
                                            disabled={isLoading}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* ACTIVE State - MFA Enabled */}
                        {mfaState === 'ACTIVE' && !isDeactivating && (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Your account is protected with two-factor authentication. You'll be asked for a verification code when signing in.
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span>Enhanced security enabled</span>
                                </div>
                                <div className="pt-4 border-t border-border">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsDeactivating(true)}
                                        className="text-destructive hover:bg-destructive/10"
                                    >
                                        <ShieldOff className="h-4 w-4 mr-2" />
                                        Disable Two-Factor Authentication
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Deactivation Form */}
                        {isDeactivating && (
                            <div className="space-y-4 pt-4 border-t border-border">
                                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                                    <p className="text-sm font-medium text-destructive mb-2">⚠️ Security Warning</p>
                                    <p className="text-xs text-muted-foreground">
                                        Disabling two-factor authentication will reduce your account security.
                                        You'll need to provide your password and current OTP code to confirm.
                                    </p>
                                </div>

                                <form onSubmit={handleDeactivate} className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium text-foreground mb-1 block">
                                            Password
                                        </label>
                                        <Input
                                            type="password"
                                            placeholder="Enter your password"
                                            value={deactivatePassword}
                                            onChange={(e) => setDeactivatePassword(e.target.value)}
                                            disabled={isLoading}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-foreground mb-1 block">
                                            Current OTP Code
                                        </label>
                                        <Input
                                            type="text"
                                            placeholder="000000"
                                            value={deactivateOtp}
                                            onChange={(e) => setDeactivateOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            className="text-center text-lg font-mono tracking-widest"
                                            maxLength={6}
                                            disabled={isLoading}
                                            required
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            type="submit"
                                            variant="destructive"
                                            disabled={isLoading || !deactivatePassword || deactivateOtp.length !== 6}
                                            className="flex-1"
                                        >
                                            {isLoading ? 'Deactivating...' : 'Confirm Deactivation'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setIsDeactivating(false);
                                                setDeactivatePassword('');
                                                setDeactivateOtp('');
                                            }}
                                            disabled={isLoading}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recovery Codes Card */}
                {showRecoveryCodes && recoveryCodes.length > 0 && (
                    <Card className="border-amber-500/20 bg-amber-500/5">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="rounded-full bg-amber-500/10 p-3">
                                    <Key className="h-6 w-6 text-amber-500" />
                                </div>
                                <div>
                                    <CardTitle>Recovery Codes</CardTitle>
                                    <CardDescription>Save these codes in a safe place</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-amber-500">Important: Save these codes now!</p>
                                        <p className="text-xs text-muted-foreground">
                                            Each code can only be used once. You won't be able to see them again after leaving this page.
                                            Use these codes to log in if you lose access to your authenticator app.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 bg-muted/50 p-4 rounded-lg">
                                {recoveryCodes.map((code, index) => (
                                    <div
                                        key={index}
                                        className="bg-background border border-border rounded px-3 py-2 text-center font-mono text-sm"
                                    >
                                        {code}
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={copyAllCodes}
                                    className="flex-1"
                                >
                                    {codesCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                                    {codesCopied ? 'Copied!' : 'Copy All Codes'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={downloadCodes}
                                    className="flex-1"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Codes
                                </Button>
                            </div>

                            <Button
                                variant="secondary"
                                onClick={() => setShowRecoveryCodes(false)}
                                className="w-full"
                            >
                                I've Saved My Codes
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Regenerate Recovery Codes */}
                {mfaState === 'ACTIVE' && !showRecoveryCodes && !isRegenerating && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="rounded-full bg-muted p-3">
                                    <Key className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                    <CardTitle>Recovery Codes</CardTitle>
                                    <CardDescription>Generate new backup codes for account recovery</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                If you've lost your recovery codes or used them all, you can generate a new set.
                                This will invalidate all previous recovery codes.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => setIsRegenerating(true)}
                            >
                                <Key className="h-4 w-4 mr-2" />
                                Regenerate Recovery Codes
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Regenerate Form */}
                {isRegenerating && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Regenerate Recovery Codes</CardTitle>
                            <CardDescription>Enter your password to generate new recovery codes</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleRegenerateCodes} className="space-y-4">
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                                    <p className="text-sm text-amber-500">
                                        ⚠️ This will invalidate all your existing recovery codes. Make sure to save the new ones.
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-foreground mb-1 block">
                                        Password
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="Enter your password"
                                        value={regeneratePassword}
                                        onChange={(e) => setRegeneratePassword(e.target.value)}
                                        disabled={isLoading}
                                        required
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        type="submit"
                                        disabled={isLoading || !regeneratePassword}
                                    >
                                        {isLoading ? 'Generating...' : 'Generate New Codes'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsRegenerating(false);
                                            setRegeneratePassword('');
                                        }}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
