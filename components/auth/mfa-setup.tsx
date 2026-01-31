'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, ShieldCheck, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';

interface MfaSetupProps {
  /** Initial MFA status - true if already enabled */
  initialMfaEnabled?: boolean;
}

type SetupState = 'IDLE' | 'SETUP' | 'SUCCESS';

export default function MfaSetup({ initialMfaEnabled = false }: MfaSetupProps) {
  const { user } = useAuth();
  const [state, setState] = useState<SetupState>(initialMfaEnabled ? 'SUCCESS' : 'IDLE');
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleStartSetup = async () => {
    setIsLoading(true);

    try {
      // Get access token from auth context via localStorage
      const authTokens = localStorage.getItem('auth_tokens');
      
      if (!authTokens) {
        toast.error('You must be logged in to enable MFA');
        setIsLoading(false);
        return;
      }

      const tokens = JSON.parse(authTokens);
      const accessToken = tokens.access;

      console.log('Starting MFA setup with token:', accessToken?.substring(0, 20) + '...');

      const response = await fetch('http://localhost:8000/api/auth/mfa/setup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.log('MFA setup response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('MFA setup failed:', errorData);
        toast.error(errorData.error || 'Failed to setup MFA');
        setIsLoading(false);
        setState('IDLE');
        return;
      }

      const data = await response.json();
      console.log('MFA setup data received:', data);
      
      // Backend returns 'provisioning_uri', not 'otpauth_url'
      const otpauthUrl = data.otpauth_url || data.provisioning_uri;
      
      if (!data.secret || !otpauthUrl) {
        console.error('Missing secret or otpauth_url in response:', data);
        toast.error('Invalid response from server');
        setIsLoading(false);
        setState('IDLE');
        return;
      }

      setSecret(data.secret);
      setOtpauthUrl(otpauthUrl);
      setState('SETUP');
      
      toast.success('MFA setup initiated. Please scan the QR code.');

    } catch (error) {
      console.error('MFA setup error:', error);
      toast.error('Network error. Please try again.');
      setState('IDLE');
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
        toast.error('You must be logged in to verify MFA');
        setIsLoading(false);
        return;
      }

      const tokens = JSON.parse(authTokens);
      const accessToken = tokens.access;

      console.log('Verifying MFA code:', verificationCode);

      const response = await fetch('http://localhost:8000/api/auth/mfa/verify/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ otp: verificationCode }),
      });

      console.log('MFA verify response status:', response.status);

      const data = await response.json();
      console.log('MFA verify response data:', data);

      if (!response.ok) {
        toast.error(data.error || 'Invalid verification code');
        setIsLoading(false);
        return;
      }

      setState('SUCCESS');
      toast.success('Two-Factor Authentication activated successfully!');
      setVerificationCode('');

    } catch (error) {
      console.error('MFA verification error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success('Secret key copied to clipboard');
    
    setTimeout(() => setCopied(false), 2000);
  };

  // SUCCESS state - MFA already enabled
  if (state === 'SUCCESS') {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-green-500/10 p-3">
            <ShieldCheck className="h-6 w-6 text-green-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-foreground">Two-Factor Authentication</h3>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                Active
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Your account is protected with two-factor authentication. You'll be asked for a verification code when signing in.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              <span>Enhanced security enabled</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // IDLE state - Enable button
  if (state === 'IDLE') {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">Two-Factor Authentication</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add an extra layer of security to your account. You'll need your password and a verification code from your phone to sign in.
            </p>
            <Button
              onClick={handleStartSetup}
              disabled={isLoading}
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              {isLoading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // SETUP state - QR code and verification
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">Set Up Two-Factor Authentication</h3>
            <p className="text-sm text-muted-foreground">
              Follow these steps to enable MFA on your account.
            </p>
          </div>
        </div>

        {/* Step 1: Scan QR Code */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              1
            </div>
            <h4 className="font-medium text-foreground">Scan this QR code with your authenticator app</h4>
          </div>
          
          {otpauthUrl ? (
            <div className="flex justify-center p-8 bg-white rounded-lg border-2 border-border shadow-sm">
              <QRCodeSVG 
                value={otpauthUrl} 
                size={240} 
                level="M"
                includeMargin={true}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>
          ) : (
            <div className="flex justify-center p-8 bg-muted rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">Loading QR code...</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Use apps like Google Authenticator, Authy, or Microsoft Authenticator
          </p>

          {/* Debug info - can be removed later */}
          {process.env.NODE_ENV === 'development' && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Debug: Show OTP Auth URL</summary>
              <code className="block mt-2 p-2 bg-muted rounded text-xs break-all">
                {otpauthUrl}
              </code>
            </details>
          )}
        </div>

        {/* Step 2: Manual Entry */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
              2
            </div>
            <h4 className="font-medium text-foreground">Can't scan? Enter the secret key manually</h4>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <code className="flex-1 text-sm font-mono text-foreground break-all">
              {secret}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySecret}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="font-medium text-blue-900 dark:text-blue-100">📱 Manual Setup Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
              <li>Open your authenticator app</li>
              <li>Choose "Enter a setup key" or "Manual entry"</li>
              <li>Account name: <strong>SecureMed ({user?.username})</strong></li>
              <li>Key: <strong>Paste the secret above</strong></li>
              <li>Time based: <strong>Yes</strong></li>
            </ol>
          </div>
        </div>

        {/* Step 3: Verify Code */}
        <form onSubmit={handleVerify} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
              3
            </div>
            <h4 className="font-medium text-foreground">Enter the 6-digit code from your app</h4>
          </div>
          
          <div className="flex gap-3">
            <Input
              type="text"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="flex-1 text-center text-lg font-mono tracking-widest"
              maxLength={6}
              disabled={isLoading}
              required
            />
            <Button
              type="submit"
              disabled={isLoading || verificationCode.length !== 6}
              className="gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              {isLoading ? 'Verifying...' : 'Verify & Activate'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            The code changes every 30 seconds. Enter the current code shown in your authenticator app.
          </p>
        </form>

        {/* Cancel Button */}
        <div className="pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => setState('IDLE')}
            disabled={isLoading}
            className="w-full"
          >
            Cancel Setup
          </Button>
        </div>
      </div>
    </div>
  );
}
