'use client';

import { useState } from 'react';
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
import { UserPlus, Send, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

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

    const [department, setDepartment] = useState('');
    const [priority, setPriority] = useState('routine');
    const [notes, setNotes] = useState('');

    const handleSubmit = async () => {
        if (!department) return;

        setIsLoading(true);
        try {
            // Simulate API call
            // await api.post('/referrals/', { ... });
            await new Promise(resolve => setTimeout(resolve, 1500));

            setIsSuccess(true);
            toast({
                title: 'Referral Sent',
                description: `Patient ${patientName} has been referred to ${department}.`,
            });

            setTimeout(() => {
                setIsSuccess(false);
                setDepartment('');
                setNotes('');
                onClose();
            }, 2000);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to send referral. Please try again.',
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
                                Create a new specialist referral for <span className="font-bold text-foreground">{patientName}</span>.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-6 py-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Target Department</Label>
                                <Select value={department} onValueChange={setDepartment}>
                                    <SelectTrigger className="h-12 rounded-xl border-border bg-muted/20">
                                        <SelectValue placeholder="Select Specialty" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Cardiology">Cardiology</SelectItem>
                                        <SelectItem value="Neurology">Neurology</SelectItem>
                                        <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                                        <SelectItem value="Dermatology">Dermatology</SelectItem>
                                        <SelectItem value="Oncology">Oncology</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

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

                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Clinical Notes</Label>
                                <Textarea
                                    placeholder="Reason for referral, key symptoms, etc..."
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
                                disabled={!department || isLoading}
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
                            The referral request has been successfully transmitted to the <b>{department}</b> department.
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
