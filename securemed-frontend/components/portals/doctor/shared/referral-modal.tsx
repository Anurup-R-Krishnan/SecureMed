'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { UserPlus, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { referralService } from '@/services/referrals';
import { appointmentService, Doctor } from '@/services/appointments';

interface ReferralModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
    patientName: string;
}

export default function ReferralModal({ isOpen, onClose, patientId, patientName }: ReferralModalProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loadingDoctors, setLoadingDoctors] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [priority, setPriority] = useState('routine');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchDoctors();
        }
    }, [isOpen]);

    const fetchDoctors = async () => {
        setLoadingDoctors(true);
        try {
            const allDoctors = await appointmentService.getDoctors();
            setDoctors(allDoctors);
        } catch (error) {
            console.error('Failed to fetch doctors:', error);
        } finally {
            setLoadingDoctors(false);
        }
    };

    const selectedDoctorObj = doctors.find(d => String(d.id) === selectedDoctor);

    const handleSubmit = async () => {
        if (!selectedDoctor) return;

        setIsLoading(true);
        try {
            await referralService.createReferral({
                patient: parseInt(patientId),
                specialist: parseInt(selectedDoctor),
                priority: priority as 'routine' | 'urgent' | 'emergency',
                reason: notes || `Referral to ${selectedDoctorObj?.name || 'specialist'}`,
                clinical_notes: notes,
            });

            setIsSuccess(true);
            toast({
                title: 'Referral Sent',
                description: `Patient ${patientName} has been referred to ${selectedDoctorObj?.name || 'specialist'}.`,
            });

            setTimeout(() => {
                setIsSuccess(false);
                setSelectedDoctor('');
                setNotes('');
                onClose();
            }, 2000);
        } catch (error: any) {
            const errData = error.response?.data;
            let errMsg = 'Failed to send referral. Please try again.';
            if (errData) {
                if (typeof errData === 'string') errMsg = errData;
                else if (errData.detail) errMsg = errData.detail;
                else if (errData.error) errMsg = errData.error;
                else {
                    // Collect field errors
                    const fieldErrors = Object.entries(errData)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                        .join('; ');
                    if (fieldErrors) errMsg = fieldErrors;
                }
            }
            toast({
                title: 'Error',
                description: errMsg,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-card border-none shadow-2xl">
                {!isSuccess ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-2xl font-black">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <UserPlus className="h-5 w-5" />
                                </div>
                                Refer Patient
                            </DialogTitle>
                            <DialogDescription className="text-base">
                                Refer <span className="font-bold text-foreground">{patientName}</span> to another doctor or department.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-6 py-4">
                            {/* Target Doctor Selection */}
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Refer To Doctor</Label>
                                {loadingDoctors ? (
                                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading doctors...
                                    </div>
                                ) : (
                                    <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                                        <SelectTrigger className="h-12 rounded-xl border-border bg-muted/20">
                                            <SelectValue placeholder="Select a doctor..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {doctors.map((doc) => (
                                                <SelectItem key={doc.id} value={String(doc.id)}>
                                                    {doc.name} — {doc.specialization || doc.department_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                {selectedDoctorObj && (
                                    <p className="text-xs text-muted-foreground">
                                        {selectedDoctorObj.specialization} • {selectedDoctorObj.hospital}
                                    </p>
                                )}
                            </div>

                            {/* Priority */}
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Priority Level</Label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger className="h-12 rounded-xl border-border bg-muted/20">
                                        <SelectValue placeholder="Select Priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="routine">Routine (Standard)</SelectItem>
                                        <SelectItem value="urgent">Urgent (48-72 Hours)</SelectItem>
                                        <SelectItem value="emergency">Emergency (Immediate)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Clinical Notes */}
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Reason & Clinical Notes</Label>
                                <Textarea
                                    placeholder="Reason for referral, key symptoms, relevant history..."
                                    className="min-h-[120px] rounded-xl border-border bg-muted/20 resize-none"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="ghost" onClick={onClose} disabled={isLoading} className="font-bold">Cancel</Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={!selectedDoctor || !notes.trim() || isLoading}
                                className="font-bold shadow-lg shadow-primary/20"
                            >
                                {isLoading ? 'Sending...' : (
                                    <>
                                        Send Referral <Send className="h-4 w-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                        <div className="h-20 w-20 rounded-full bg-green-500 text-white flex items-center justify-center mb-6 shadow-xl shadow-green-500/30">
                            <CheckCircle2 className="h-10 w-10" />
                        </div>
                        <h3 className="text-2xl font-black text-foreground mb-2">Referral Sent!</h3>
                        <p className="text-muted-foreground max-w-xs mx-auto">
                            The referral has been sent to <b>{selectedDoctorObj?.name || 'the specialist'}</b>.
                            They will receive access to the patient&apos;s records.
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
