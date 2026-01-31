'use client';

import React from "react"

import { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoginModalProps {
  isOpen: boolean;
  role: 'patient' | 'doctor' | 'admin' | 'technician';
  onClose: () => void;
  onSubmit: () => void;
  onChangeRole: (role: 'patient' | 'doctor' | 'admin' | 'technician') => void;
}

export default function LoginModal({
  isOpen,
  role,
  onClose,
  onSubmit,
  onChangeRole,
}: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const roleLabels = {
    patient: 'Patient',
    doctor: 'Doctor',
    admin: 'Administrator',
    technician: 'Lab Technician',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary to-accent p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-black/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-primary-foreground" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Lock className="h-6 w-6 text-primary-foreground" />
            <h2 className="text-2xl font-bold text-primary-foreground">Sign In</h2>
          </div>
          <p className="text-primary-foreground/80">Welcome to Fortis Healthcare</p>
        </div>

        {/* Role Selection */}
        <div className="p-6 border-b border-border">
          <p className="text-sm font-medium text-muted-foreground mb-3">Login as:</p>
          <div className="flex gap-2">
            {(['patient', 'doctor', 'technician', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => onChangeRole(r)}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 h-5 w-5 text-muted-foreground pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
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
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-muted-foreground hover:text-foreground"
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
              <input type="checkbox" className="rounded" />
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
          >
            Sign In as {roleLabels[role]}
          </Button>

          {/* Demo Info */}
          <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground">
            <p className="font-medium mb-2">Demo Credentials:</p>
            <p>Email: demo@example.com</p>
            <p>Password: demo123</p>
          </div>
        </form>

        {/* Footer */}
        <div className="px-8 py-4 bg-muted/30 text-center text-sm text-muted-foreground">
          Don't have an account? <a href="#" className="text-primary font-medium hover:underline">Sign up</a>
        </div>
      </div>
    </div>
  );
}
