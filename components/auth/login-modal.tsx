'use client';

import React from "react"

import { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';

interface LoginModalProps {
  isOpen: boolean;
  role: 'patient' | 'doctor' | 'admin';
  onClose: () => void;
  onChangeRole: (role: 'patient' | 'doctor' | 'admin') => void;
}

type LoginStep = 'STEP_CREDENTIALS' | 'STEP_MFA';

export default function LoginModal({
  isOpen,
  role,
  onClose,
  onChangeRole,
}: LoginModalProps) {
  const [step, setStep] = useState<LoginStep>('STEP_CREDENTIALS');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, verifyMfa } = useAuth();
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(username, password);

      if (result.error) {
        toast({
          title: 'Login Failed',
          description: result.error,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (result.status === 'MFA_REQUIRED' && result.tempToken) {
        // Switch to MFA step
        setTempToken(result.tempToken);
        setStep('STEP_MFA');
        toast({
          title: 'MFA Required',
          description: 'Please enter your 6-digit authentication code.',
        });
      } else if (result.status === 'SUCCESS') {
        // Login successful
        toast({
          title: 'Welcome back!',
          description: 'You have been successfully logged in.',
        });
        handleClose();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await verifyMfa(tempToken, otpCode);

      if (success) {
        toast({
          title: 'Welcome back!',
          description: 'You have been successfully logged in.',
        });
        handleClose();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset all state
    setStep('STEP_CREDENTIALS');
    setUsername('');
    setPassword('');
    setOtpCode('');
    setTempToken('');
    setShowPassword(false);
    setIsLoading(false);
    onClose();
  };

  const roleLabels = {
    patient: 'Patient',
    doctor: 'Doctor',
    admin: 'Administrator',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary to-accent p-8">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-black/10 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <X className="h-5 w-5 text-primary-foreground" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            {step === 'STEP_CREDENTIALS' ? (
              <Lock className="h-6 w-6 text-primary-foreground" />
            ) : (
              <Shield className="h-6 w-6 text-primary-foreground" />
            )}
            <h2 className="text-2xl font-bold text-primary-foreground">
              {step === 'STEP_CREDENTIALS' ? 'Sign In' : 'Two-Factor Authentication'}
            </h2>
          </div>
          <p className="text-primary-foreground/80">
            {step === 'STEP_CREDENTIALS'
              ? 'Welcome to Fortis Healthcare'
              : 'Enter your authentication code'}
          </p>
        </div>

        {step === 'STEP_CREDENTIALS' ? (
          <>
            {/* Role Selection */}
            <div className="p-6 border-b border-border">
              <p className="text-sm font-medium text-muted-foreground mb-3">Login as:</p>
              <div className="flex gap-2">
                {(['patient', 'doctor', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => onChangeRole(r)}
                    disabled={isLoading}
                    className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${role === r
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-border'
                      }`}
                  >
                    {roleLabels[r]}
                  </button>
                ))}
              </div>
            </div>

            {/* Credentials Form */}
            <form onSubmit={handleCredentialsSubmit} className="p-8 space-y-5">
              {/* Username Input */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Username
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your_username"
                    className="w-full pl-10 pr-4 py-2.5 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded" disabled={isLoading} />
                  <span className="text-muted-foreground">Remember me</span>
                </label>
                <a href="#" className="text-primary hover:underline font-medium">
                  Forgot password?
                </a>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : `Sign In as ${roleLabels[role]}`}
              </Button>

              {/* Demo Info */}
              <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground">
                <p className="font-medium mb-2">Demo Credentials:</p>
                <p>Username: demo_user</p>
                <p>Password: SecurePass123!@#</p>
              </div>
            </form>
          </>
        ) : (
          /* MFA Form */
          <form onSubmit={handleMfaSubmit} className="p-8 space-y-5">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            {/* OTP Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Authentication Code
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground text-center text-2xl tracking-widest placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                required
                maxLength={6}
                disabled={isLoading}
                autoFocus
              />
            </div>

            {/* Verify Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading || otpCode.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </Button>

            {/* Back Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setStep('STEP_CREDENTIALS');
                setOtpCode('');
                setTempToken('');
              }}
              disabled={isLoading}
            >
              Back to Login
            </Button>
          </form>
        )}

        {/* Footer */}
        {step === 'STEP_CREDENTIALS' && (
          <div className="px-8 py-4 bg-muted/30 text-center text-sm text-muted-foreground">
            Don't have an account? <a href="#" className="text-primary font-medium hover:underline">Sign up</a>
          </div>
        )}
      </div>
    </div>
  );
}
