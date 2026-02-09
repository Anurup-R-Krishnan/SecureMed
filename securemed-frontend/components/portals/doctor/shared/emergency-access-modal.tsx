'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ShieldAlert, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface EmergencyAccessModalProps {
  isOpen: boolean;
  patientId: string;
  patientName: string;
  onClose: () => void;
  onSubmit: (data: { patientId: string; reason: string; emergencyType: string }) => void;
}

export default function EmergencyAccessModal({
  isOpen,
  patientId,
  patientName,
  onClose,
  onSubmit,
}: EmergencyAccessModalProps) {
  const [reason, setReason] = useState('');
  const [emergencyType, setEmergencyType] = useState('life_threatening');
  const [loading, setLoading] = useState(false);
  const [granted, setGranted] = useState(false);
  const [searchPatientId, setSearchPatientId] = useState(patientId || '');

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for emergency access.');
      return;
    }

    const pid = patientId || searchPatientId;
    if (!pid.trim()) {
      toast.error('Please enter a Patient ID.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/medical-records/records/break_glass/', {
        patient_id: pid,
        reason: reason.trim(),
        emergency_type: emergencyType,
      });

      if (response.data) {
        setGranted(true);
        toast.success('Emergency access granted. All actions are being audited.');
        onSubmit({ patientId: pid, reason, emergencyType });
      }
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Failed to request emergency access.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setEmergencyType('life_threatening');
    setGranted(false);
    setSearchPatientId('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Emergency Break-Glass Access
          </DialogTitle>
          <DialogDescription>
            This action grants emergency access to patient records and will be fully audited.
            Only use in genuine emergencies.
          </DialogDescription>
        </DialogHeader>

        {granted ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-lg font-semibold text-foreground">Access Granted</p>
            <p className="text-sm text-muted-foreground text-center">
              Emergency access to <strong>{patientName || searchPatientId}</strong> has been granted.
              All activity is being monitored and logged.
            </p>
            <Button onClick={handleClose} className="mt-4">Close</Button>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-2">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">
                  Break-glass access bypasses normal consent controls. This event is permanently logged
                  and will be reviewed by compliance.
                </p>
              </div>

              {!patientId && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Patient ID</label>
                  <input
                    type="text"
                    value={searchPatientId}
                    onChange={(e) => setSearchPatientId(e.target.value)}
                    placeholder="e.g. P-0001"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              )}

              {patientId && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Patient</label>
                  <p className="text-sm text-muted-foreground">{patientName} ({patientId})</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Emergency Type</label>
                <select
                  value={emergencyType}
                  onChange={(e) => setEmergencyType(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="life_threatening">Life Threatening</option>
                  <option value="urgent_care">Urgent Care</option>
                  <option value="critical_lab">Critical Lab Result</option>
                  <option value="other">Other Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Reason for Access <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe the emergency situation requiring immediate access..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleSubmit}
                disabled={loading || !reason.trim()}
              >
                {loading ? 'Requesting...' : 'Grant Emergency Access'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
