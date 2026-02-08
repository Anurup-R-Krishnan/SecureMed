'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getDoctors } from '@/lib/services/appointment-service';
import { referPatient } from '@/lib/services/clinical-service';
import {
    X,
    Search,
    UserPlus,
    CheckCircle,
    Loader2,
    Stethoscope,
    MapPin,
    ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Doctor {
    id: string;
    name: string;
    specialty: string;
    hospital: string;
    description: string;
}

interface ReferralModalProps {
    patientId: string;
    patientName: string;
    currentDoctorId: string;
    currentDoctorName: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ReferralModal({
    patientId,
    patientName,
    currentDoctorId,
    currentDoctorName,
    onClose,
    onSuccess
}: ReferralModalProps) {
    const { toast } = useToast();
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Load doctors
    useEffect(() => {
        const fetchDoctors = async () => {
            setIsLoading(true);
            try {
                const data = await getDoctors();
                // Filter out current doctor
                setDoctors(data.filter((d: Doctor) => d.id !== currentDoctorId));
            } catch (error) {
                console.error('Failed to load doctors', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDoctors();
    }, [currentDoctorId]);

    // Filter doctors
    const filteredDoctors = doctors.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.specialty.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleReferral = async () => {
        if (!selectedDoctor) return;

        setIsSubmitting(true);
        try {
            const result = await referPatient(
                patientId,
                currentDoctorId,
                currentDoctorName,
                selectedDoctor.id,
                selectedDoctor.name
            );

            if (result.success) {
                setIsSuccess(true);
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2000);
            } else {
                toast({
                    title: 'Referral Failed',
                    description: result.message || 'Could not process referral',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                <Card className="w-full max-w-md p-8 text-center bg-card border-none shadow-2xl rounded-3xl animate-in zoom-in-95 duration-300">
                    <div className="h-20 w-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
                        <CheckCircle className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-foreground mb-2">Referral Sent!</h2>
                    <p className="text-muted-foreground mb-6">
                        Access granted to <span className="font-bold text-foreground">{selectedDoctor?.name}</span>.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300 p-4">
            <Card className="w-full max-w-2xl h-[80vh] flex flex-col bg-card border-none shadow-2xl rounded-3xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-border bg-muted/10 shrink-0 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-primary" />
                            Refer Patient
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Grant secure access to another specialist
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-muted">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Search */}
                    <div className="p-6 pb-2 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by name or specialty..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Doctor List */}
                    <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-3 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-40 opacity-50">
                                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                <p className="text-xs font-bold uppercase tracking-widest">Loading Specialists...</p>
                            </div>
                        ) : filteredDoctors.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No specialists found matching "{searchQuery}"</p>
                            </div>
                        ) : (
                            filteredDoctors.map(doc => (
                                <div
                                    key={doc.id}
                                    onClick={() => setSelectedDoctor(doc)}
                                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer group flex items-start gap-4 ${selectedDoctor?.id === doc.id
                                            ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/20'
                                            : 'border-border/50 hover:border-primary/30 hover:bg-muted/30'
                                        }`}
                                >
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${selectedDoctor?.id === doc.id ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                                        }`}>
                                        <Stethoscope className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-foreground">{doc.name}</h3>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                                {doc.specialty}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                            <MapPin className="h-3 w-3" />
                                            {doc.hospital}
                                        </div>
                                        <p className="text-xs text-foreground/60 mt-2 line-clamp-1">
                                            {doc.description}
                                        </p>
                                    </div>
                                    {selectedDoctor?.id === doc.id && (
                                        <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 animate-in zoom-in">
                                            <CheckCircle className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-muted/10 shrink-0 flex items-center justify-between gap-4">
                    <div className="flex-1">
                        {selectedDoctor ? (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Referral to:</span>
                                <span className="font-bold text-foreground">{selectedDoctor.name}</span>
                            </div>
                        ) : (
                            <span className="text-sm text-muted-foreground italic">Select a specialist to proceed</span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleReferral}
                            disabled={!selectedDoctor || isSubmitting}
                            className="px-6 font-bold shadow-lg shadow-primary/20"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    Confirm Referral
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
