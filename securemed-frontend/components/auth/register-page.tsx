'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Mail, Lock, User, Code, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import ReCAPTCHA from 'react-google-recaptcha';

interface RegisterPageProps {
  onSuccess: (role: 'patient' | 'doctor') => void;
  onBackToLogin: () => void;
}

export default function RegisterPage({ onSuccess, onBackToLogin }: RegisterPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [invitationEmail, setInvitationEmail] = useState('');
  const [invitationToken, setInvitationToken] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Google reCAPTCHA Site Key
  // For development: uses Google's test key (always passes)
  // For production: set NEXT_PUBLIC_RECAPTCHA_SITE_KEY environment variable
  const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || 
    '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    role: 'patient' as 'patient' | 'provider',
    medicalLicenseNumber: '',
  });

  const { toast } = useToast();
  const { login } = useAuth();

  // Verify invitation token on component mount
  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setTokenError('No invitation token provided. Registration requires a valid invitation.');
      setIsVerifyingToken(false);
      return;
    }

    setInvitationToken(token);
    verifyInvitationToken(token);
  }, [searchParams]);

  const verifyInvitationToken = async (token: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/invite/verify/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setTokenValid(true);
        setInvitationEmail(data.email);
        setFormData(prev => ({ ...prev, email: data.email }));
      } else {
        setTokenError(data.message || 'Invalid invitation token');
        setTokenValid(false);
      }
    } catch (error) {
      setTokenError('Failed to verify invitation token. Please try again.');
      setTokenValid(false);
    } finally {
      setIsVerifyingToken(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaToken) {
      toast({
        title: 'CAPTCHA Required',
        description: 'Please verify that you are not a robot.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/auth/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          token: invitationToken,
          captcha_token: captchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = typeof data.error === 'string'
          ? data.error
          : Object.values(data).flat().join(', ');

        toast({
          title: 'Registration Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        
        // Reset reCAPTCHA on error
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
        setIsLoading(false);
        return;
      }

      // Registration successful
      toast({
        title: 'Registration Successful!',
        description: 'Logging you in...',
      });

      // Auto-login after registration
      const loginResult = await login(formData.email, formData.password);

      if (loginResult.status === 'SUCCESS') {
        toast({
          title: 'Welcome!',
          description: 'You have been logged in successfully.',
        });

        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else if (loginResult.error) {
        toast({
          title: 'Please login',
          description: 'Registration successful. Please login with your credentials.',
        });
        setTimeout(() => {
          onBackToLogin();
        }, 1500);
      }

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Network error. Please try again.',
        variant: 'destructive',
      });
      
      // Reset reCAPTCHA on error
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while verifying token
  if (isVerifyingToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  // Show error state if token is invalid
  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={onBackToLogin}
              className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back to Login</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-destructive/50 bg-card p-8">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <h2 className="text-2xl font-bold text-foreground">Invalid Invitation</h2>
              </div>
              <p className="text-muted-foreground mb-6">{tokenError}</p>
              <button
                onClick={onBackToLogin}
                className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Return to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBackToLogin}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Login</span>
          </button>
        </div>
      </div>

      {/* Registration Form */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8">
            {/* Title */}
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Create Account
            </h2>
            <p className="text-muted-foreground mb-6">
              You've been invited to join SecureMed
            </p>

            {/* Invitation Info */}
            <div className="mb-6 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-foreground">
                <span className="font-medium">Invited email:</span> {invitationEmail}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username Input */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <input
                    id="username"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="johndoe"
                    className="w-full rounded-lg border border-border bg-background px-10 py-2.5 text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Email Input (Read-only) */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    className="w-full rounded-lg border border-border bg-muted px-10 py-2.5 text-foreground cursor-not-allowed"
                    readOnly
                    disabled
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Email is set by your invitation
                </p>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••••••"
                    className="w-full rounded-lg border border-border bg-background px-10 py-2.5 text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                    required
                    disabled={isLoading}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Must be at least 12 characters with 1 special character
                </p>
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="password_confirm" className="block text-sm font-medium text-foreground mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <input
                    id="password_confirm"
                    type="password"
                    name="password_confirm"
                    value={formData.password_confirm}
                    onChange={handleInputChange}
                    placeholder="••••••••••••"
                    className="w-full rounded-lg border border-border bg-background px-10 py-2.5 text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  I am a:
                </label>
                <div className="flex gap-4">
                  <label className="flex-1 relative">
                    <input
                      type="radio"
                      name="role"
                      value="patient"
                      checked={formData.role === 'patient'}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'patient' | 'provider' })}
                      className="peer sr-only"
                      disabled={isLoading}
                    />
                    <div className="cursor-pointer rounded-lg border-2 border-border bg-background px-4 py-3 text-center transition-all peer-checked:border-primary peer-checked:bg-primary/10 hover:border-primary/50">
                      <span className="font-medium">Patient</span>
                    </div>
                  </label>
                  <label className="flex-1 relative">
                    <input
                      type="radio"
                      name="role"
                      value="provider"
                      checked={formData.role === 'provider'}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'patient' | 'provider' })}
                      className="peer sr-only"
                      disabled={isLoading}
                    />
                    <div className="cursor-pointer rounded-lg border-2 border-border bg-background px-4 py-3 text-center transition-all peer-checked:border-primary peer-checked:bg-primary/10 hover:border-primary/50">
                      <span className="font-medium">Doctor</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Medical License Number (for Doctors) */}
              {formData.role === 'provider' && (
                <div className="space-y-2 p-4 rounded-lg bg-muted/50 border border-border">
                  <label htmlFor="medicalLicenseNumber" className="block text-sm font-medium text-foreground">
                    Medical License Number <span className="text-muted-foreground">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Code className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <input
                      id="medicalLicenseNumber"
                      type="text"
                      name="medicalLicenseNumber"
                      value={formData.medicalLicenseNumber}
                      onChange={handleInputChange}
                      placeholder="e.g., MD-12345-2024"
                      className="w-full rounded-lg border border-border bg-background px-10 py-2.5 text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This helps verify your credentials (can be added later)
                  </p>
                </div>
              )}

              {/* Google reCAPTCHA v2 */}
              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={handleCaptchaChange}
                  theme="light"
                />
              </div>

              {process.env.NODE_ENV === 'development' && (
                <p className="text-xs text-muted-foreground text-center">
                  Using Google's test reCAPTCHA key (always passes in dev mode)
                </p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !captchaToken}
                className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            {/* Login Link */}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {'Already have an account? '}
              <button
                onClick={onBackToLogin}
                className="font-semibold text-primary hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
