'use client';

import React from "react"

import { useState } from 'react';
import { ArrowLeft, Mail, Lock, User, Code } from 'lucide-react';

interface RegisterPageProps {
  onSuccess: (role: 'patient' | 'doctor') => void;
  onBackToLogin: () => void;
}

export default function RegisterPage({ onSuccess, onBackToLogin }: RegisterPageProps) {
  const [step, setStep] = useState<'form' | 'email-verify'>('form');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    invitationCode: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('email-verify');
  };

  const handleVerifyEmail = (e: React.FormEvent) => {
    e.preventDefault();
    // Determine role based on invitation code
    const role = formData.invitationCode.includes('doc') ? 'doctor' : 'patient';
    onSuccess(role);
  };

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
              {step === 'form' ? 'Create Account' : 'Verify Email'}
            </h2>
            <p className="text-muted-foreground mb-8">
              {step === 'form'
                ? 'Join SecureMed to access healthcare services'
                : 'Check your email for verification link'}
            </p>

            {/* Form Step */}
            {step === 'form' && (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name Input */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      className="w-full rounded-lg border border-border bg-background px-10 py-2.5 text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                      required
                    />
                  </div>
                </div>

                {/* Email Input */}
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
                      onChange={handleInputChange}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-border bg-background px-10 py-2.5 text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                      required
                    />
                  </div>
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
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-border bg-background px-10 py-2.5 text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                      required
                    />
                  </div>
                </div>

                {/* Invitation Code Input */}
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-foreground mb-2">
                    Invitation Code
                  </label>
                  <div className="relative">
                    <Code className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <input
                      id="code"
                      type="text"
                      name="invitationCode"
                      value={formData.invitationCode}
                      onChange={handleInputChange}
                      placeholder="Enter your invitation code"
                      className="w-full rounded-lg border border-border bg-background px-10 py-2.5 text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                      required
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    (Use 'doctor' or 'patient' for demo)
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Continue
                </button>
              </form>
            )}

            {/* Verify Email Step */}
            {step === 'email-verify' && (
              <form onSubmit={handleVerifyEmail} className="space-y-5">
                <div>
                  <label htmlFor="verifyCode" className="block text-sm font-medium text-foreground mb-2">
                    6-Digit Code
                  </label>
                  <input
                    id="verifyCode"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-center text-2xl tracking-widest text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Verify Email
                </button>
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Back
                </button>
              </form>
            )}

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
