'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle2, Loader2, FileSignature } from 'lucide-react';
import { getAccessToken } from '@/lib/auth-utils';

interface Prescription {
    id: number;
    medication_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
    is_signed: boolean;
}

interface SignPrescriptionModalProps {
    prescription: Prescription | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (signedPrescription: any) => void;
}

export function SignPrescriptionModal({
    prescription,
    isOpen,
    onClose,
    onSuccess,
}: SignPrescriptionModalProps) {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSign = async () => {
        if (!prescription || !password) return;

        setIsLoading(true);
        setError(null);

        try {
            const token = getAccessToken();
            const response = await fetch(
                `http://localhost:8000/api/medical-records/prescriptions/${prescription.id}/sign/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ password }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to sign prescription');
            }

            setSuccess(true);
            setTimeout(() => {
                onSuccess(data);
                handleClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setPassword('');
        setError(null);
        setSuccess(false);
        onClose();
    };

    if (!prescription) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSignature className="h-5 w-5 text-blue-600" />
                        Sign Prescription
                    </DialogTitle>
                    <DialogDescription>
                        You are about to digitally sign this prescription. This action is
                        <strong> irreversible</strong> and will lock the prescription from further edits.
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="flex flex-col items-center py-6">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                        <p className="text-lg font-medium text-green-700">Prescription Signed Successfully!</p>
                    </div>
                ) : (
                    <>
                        {/* Prescription Details */}
                        <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                            <h4 className="font-semibold text-slate-800">Prescription Details</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-slate-500">Medication:</span>
                                <span className="font-medium">{prescription.medication_name}</span>
                                <span className="text-slate-500">Dosage:</span>
                                <span className="font-medium">{prescription.dosage}</span>
                                <span className="text-slate-500">Frequency:</span>
                                <span className="font-medium">{prescription.frequency}</span>
                                <span className="text-slate-500">Duration:</span>
                                <span className="font-medium">{prescription.duration}</span>
                            </div>
                            {prescription.instructions && (
                                <div className="pt-2 border-t">
                                    <span className="text-slate-500 text-sm">Instructions: </span>
                                    <span className="text-sm">{prescription.instructions}</span>
                                </div>
                            )}
                        </div>

                        {/* Warning */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800">
                                <p className="font-medium">Important Security Notice</p>
                                <p>Re-enter your password to confirm your identity and digitally sign this prescription.</p>
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <Label htmlFor="password">Confirm Your Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSign()}
                                disabled={isLoading}
                            />
                            {error && (
                                <p className="text-sm text-red-600">{error}</p>
                            )}
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSign}
                                disabled={!password || isLoading}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing...
                                    </>
                                ) : (
                                    <>
                                        <FileSignature className="mr-2 h-4 w-4" />
                                        Sign Prescription
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default SignPrescriptionModal;
