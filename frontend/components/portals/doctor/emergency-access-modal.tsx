'use client';

import React from "react"

import { useState } from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface EmergencyAccessModalProps {
  patientName: string;
  onClose: () => void;
  onSubmit: (justification: string) => void;
}

export default function EmergencyAccessModal({
  patientName,
  onClose,
  onSubmit,
}: EmergencyAccessModalProps) {
  const [justification, setJustification] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (justification.trim() && confirmed) {
      onSubmit(justification);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
      <div className="w-full max-w-md rounded-2xl bg-card border-2 border-destructive p-8 shadow-xl">
        {/* Warning Header */}
        <div className="mb-6 flex items-center gap-3 rounded-lg bg-destructive/10 p-4 text-destructive">
          <AlertTriangle className="h-6 w-6 flex-shrink-0" />
          <div>
            <p className="font-semibold">Emergency Break-Glass Access</p>
            <p className="text-sm">This action will be logged and audited</p>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="font-semibold text-foreground mb-2">Patient: {patientName}</p>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">
                You are requesting emergency access to this patient's confidential records. This
                access will be permanently logged for compliance and audit purposes.
              </p>
            </div>
          </div>

          {/* Justification Field */}
          <div>
            <label htmlFor="justification" className="block text-sm font-semibold text-foreground mb-2">
              Justification Reason <span className="text-destructive">*</span>
            </label>
            <textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain the emergency reason for accessing this patient's records..."
              className="w-full h-24 rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-destructive/50 resize-none"
              required
            />
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <input
              id="confirm"
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded cursor-pointer"
            />
            <label htmlFor="confirm" className="cursor-pointer text-sm">
              <p className="font-semibold text-foreground">
                I understand this access will be audited
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                I confirm that I am accessing these records for a legitimate emergency purpose
              </p>
            </label>
          </div>

          {/* Alert */}
          <div className="flex gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-600 mt-0.5" />
            <p className="text-xs text-yellow-700">
              Misuse of emergency access may result in disciplinary action or termination
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border bg-background px-4 py-3 font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!justification.trim() || !confirmed}
              className="flex-1 rounded-lg bg-destructive px-4 py-3 font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Access
            </button>
          </div>
        </form>

        {/* Compliance Notice */}
        <p className="mt-4 text-xs text-muted-foreground text-center">
          All access is logged. This action has been recorded for audit purposes.
        </p>
      </div>
    </div>
  );
}
