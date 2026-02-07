'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    getPatients,
    getMyPatients,
    triggerEmergencyAccess
} from '@/lib/services/clinical-service';
import { PatientQuickSummary } from '@/lib/types/patient-summary';
import {
    User,
    AlertTriangle,
    Calendar,
    Search,
    Lock,
    ArrowLeft,
    ShieldAlert,
    Globe,
    UserPlus
} from 'lucide-react';

// Specialized components
import PatientQuickSummaryHeader from './patient-quick-summary';
import EnhancedPatientTimeline from './enhanced-patient-timeline';
import ClinicalNotesPanel from './clinical-notes-panel';
import EmergencyAccessModal from './emergency-access-modal';
import EmergencySessionIndicator from './emergency-session-indicator';
import ReferralModal from './referral-modal';

interface PatientDetailViewProps {
    doctorId?: string;
    doctorName?: string;
    initialPatientId?: string;
}

export default function PatientDetailView({
    doctorId = '1',
    doctorName = 'Dr. Sarah Smith',
    initialPatientId
}: PatientDetailViewProps) {
    // State
    const [patients, setPatients] = useState<PatientQuickSummary[]>([]);
    const [assignedPatientIds, setAssignedPatientIds] = useState<Set<string>>(new Set());
    const [selectedPatient, setSelectedPatient] = useState<PatientQuickSummary | null>(null);
    const [activeTab, setActiveTab] = useState<'timeline' | 'notes'>('timeline');
    const [isEmergencyMode, setIsEmergencyMode] = useState(false);
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [emergencySessionExpiry, setEmergencySessionExpiry] = useState<string | null>(null);
    const [emergencyJustification, setEmergencyJustification] = useState<string>('');

    // Derived access state to prevent race conditions
    const isAssigned = selectedPatient ? assignedPatientIds.has(selectedPatient.patientId) : false;
    const hasAccess = isAssigned || isEmergencyMode;

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [allSearchPatients, setAllSearchPatients] = useState<PatientQuickSummary[]>([]);

    // Load patients
    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const [allPatientsData, myPatientsData] = await Promise.all([
                    getPatients(),
                    getMyPatients(doctorId)
                ]);

                // Map assigned IDs
                const assignedIds = new Set<string>(
                    (myPatientsData as any[])
                        .filter((p: any) => p.is_active)
                        .map((p: any) => p.patient_id.toString())
                );

                // For demo purposes, if no assigned patients (e.g. invalid doctor ID mock), 
                // let's assign the first patient so we can demonstrate the "unassigned" ones if there are more
                if (assignedIds.size === 0 && Array.isArray(allPatientsData) && allPatientsData.length > 0) {
                    assignedIds.add(allPatientsData[0].id.toString());
                    // If there's a second patient, leave them unassigned for testing Break Glass
                    // assignedIds.add(allPatientsData[1].id.toString());
                }

                setAssignedPatientIds(assignedIds);

                // Map Django fields to frontend interface if necessary
                const mappedPatients = allPatientsData.map((p: any) => ({
                    patientId: p.id.toString(),
                    patientName: p.name,
                    bloodGroup: p.blood_group,
                    knownAllergies: p.known_allergies || [],
                    emergencyContact: p.emergency_contact,
                    lastUpdated: p.last_updated
                }));
                setPatients(mappedPatients);
                setAllSearchPatients(mappedPatients);

            } catch (error) {
                console.error('Failed to fetch patients', error);
            }
        };
        fetchPatients();
    }, [doctorId]);

    // Effect to handle initialPatientId
    useEffect(() => {
        if (initialPatientId && patients.length > 0) {
            const patient = patients.find(p => p.patientId === initialPatientId);
            if (patient) {
                setSelectedPatient(patient);
            }
        }
    }, [initialPatientId, patients]);

    // Check access when patient is selected - NOW HANDLED VIA DERIVED STATE
    // useEffect(() => {
    //     if (!selectedPatient) return;
    //     const isAssigned = assignedPatientIds.has(selectedPatient.patientId);
    //     setHasAccess(isAssigned || isEmergencyMode);
    // }, [selectedPatient, assignedPatientIds, isEmergencyMode]);

    // Filter patients
    // If search is empty, show ONLY assigned patients.
    // If search has value, show matching patients from GLOBAL list.
    const filteredPatients = searchQuery
        ? allSearchPatients.filter(p =>
            p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.patientId.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : allSearchPatients.filter(p => assignedPatientIds.has(p.patientId));

    const handleEmergencySubmit = async (justification: string) => {
        if (selectedPatient) {
            try {
                await triggerEmergencyAccess(doctorId, doctorName, selectedPatient.patientId, justification);
                // setHasAccess(true); // Derived automatically
                setIsEmergencyMode(true);
                setEmergencyJustification(justification);

                // Set expiry to 1 hour from now
                const expiryTime = new Date();
                expiryTime.setHours(expiryTime.getHours() + 1);
                setEmergencySessionExpiry(expiryTime.toISOString());

                setShowEmergencyModal(false);
            } catch (error) {
                console.error('Failed to trigger break-glass', error);
            }
        }
    };

    const handleEndEmergencySession = () => {
        setIsEmergencyMode(false);
        setEmergencySessionExpiry(null);
        setEmergencyJustification('');
        // setHasAccess(false); // Derived automatically
        setSelectedPatient(null);
    };

    const [showReferralModal, setShowReferralModal] = useState(false);

    // ... (rest of search/filter logic)

    return (
        <div className="space-y-6">
            {/* Emergency Session Indicator */}
            {isEmergencyMode && emergencySessionExpiry && selectedPatient && (
                <EmergencySessionIndicator
                    patientName={selectedPatient.patientName}
                    justification={emergencyJustification}
                    expiresAt={emergencySessionExpiry}
                    onEndSession={handleEndEmergencySession}
                />
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Patient Records</h1>
                    <p className="text-muted-foreground italic text-sm">Managing your assigned patient clinical workflows</p>
                </div>
                {selectedPatient && hasAccess && (
                    <Button
                        onClick={() => setShowReferralModal(true)}
                        className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 border shadow-sm"
                    >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Refer Patient
                    </Button>
                )}
            </div>

            <div className="grid lg:grid-cols-4 gap-6">
                {/* Patient Sidebar List */}
                <div className="lg:col-span-1 border-r border-border pr-6 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search patients..."
                            className="w-full pl-9 pr-4 py-3 border border-border rounded-xl bg-card text-foreground text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                        />
                    </div>

                    <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="flex items-center justify-between mb-4 ml-1">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                {searchQuery ? 'Global Directory' : 'My Patients'} ({filteredPatients.length})
                            </p>
                            {searchQuery && (
                                <Globe className="h-3 w-3 text-muted-foreground" />
                            )}
                        </div>
                        {filteredPatients.map(patient => (
                            <button
                                key={patient.patientId}
                                onClick={() => setSelectedPatient(patient)}
                                className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 ${selectedPatient?.patientId === patient.patientId
                                    ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                                    : 'border-transparent hover:border-primary/20 hover:bg-muted/30'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${selectedPatient?.patientId === patient.patientId ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-foreground truncate text-sm leading-tight">{patient.patientName}</p>
                                        <p className="text-[10px] font-medium text-muted-foreground tracking-tighter uppercase">{patient.patientId}</p>
                                    </div>
                                    {patient.knownAllergies.length > 0 && (
                                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Patient Workspace */}
                <div className="lg:col-span-3 min-h-[600px]">
                    {!selectedPatient ? (
                        <Card className="h-full flex flex-col items-center justify-center p-12 text-center border-none bg-muted/20">
                            <div className="h-24 w-24 bg-white rounded-[32px] shadow-xl flex items-center justify-center mb-6">
                                <User className="h-12 w-12 text-muted-foreground opacity-30" />
                            </div>
                            <h3 className="text-2xl font-black text-foreground mb-3 tracking-tight">Select a Patient Workspace</h3>
                            <p className="text-muted-foreground max-w-sm leading-relaxed">
                                Pick a patient from the list on the left to view their medical history, add private notes, or view lab results.
                            </p>
                        </Card>
                    ) : !hasAccess ? (
                        <Card className="h-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-destructive/20 bg-destructive/5">
                            <div className="h-24 w-24 bg-white rounded-[32px] shadow-xl flex items-center justify-center mb-6">
                                <ShieldAlert className="h-12 w-12 text-destructive" />
                            </div>
                            <h3 className="text-2xl font-black text-foreground mb-3 tracking-tight">Access Restricted</h3>
                            <p className="text-muted-foreground max-w-sm leading-relaxed mb-8">
                                This patient is not currently assigned to your clinical workflow. In case of a medical emergency, you may use the break-glass protocol.
                            </p>
                            <Button
                                onClick={() => setShowEmergencyModal(true)}
                                variant="destructive"
                                className="px-8 h-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-destructive/20 active:scale-95 transition-all"
                            >
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Emergency Override
                            </Button>
                        </Card>
                    ) : (
                        <div className={`space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 p-1 rounded-[32px] transition-all ${isEmergencyMode ? 'ring-4 ring-destructive/20 bg-destructive/[0.02]' : ''}`}>
                            {isEmergencyMode && (
                                <div className="bg-destructive text-white px-6 py-3 rounded-2xl flex items-center justify-between shadow-lg shadow-destructive/20 animate-pulse">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span className="text-xs font-black uppercase tracking-[0.2em]">Emergency Access Active</span>
                                    </div>
                                    <span className="text-[10px] font-bold opacity-80">AUDIT LOG: OVERRIDE_ACTIVE</span>
                                </div>
                            )}

                            {/* Modular Quick Summary Header */}
                            <PatientQuickSummaryHeader
                                patientId={selectedPatient.patientId}
                                doctorId={doctorId}
                                doctorName={doctorName}
                            />

                            {/* Navigation Tabs */}
                            <div className="flex gap-1 p-1 bg-muted/30 rounded-2xl border border-border/50 max-w-fit">
                                <button
                                    onClick={() => setActiveTab('timeline')}
                                    className={`flex items-center gap-2 px-6 py-2.5 font-bold text-xs uppercase tracking-widest rounded-xl transition-all ${activeTab === 'timeline'
                                        ? 'bg-card text-primary shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    <Calendar className="h-4 w-4" />
                                    Timeline
                                </button>
                                <button
                                    onClick={() => setActiveTab('notes')}
                                    className={`flex items-center gap-2 px-6 py-2.5 font-bold text-xs uppercase tracking-widest rounded-xl transition-all ${activeTab === 'notes'
                                        ? 'bg-card text-primary shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    <Lock className="h-4 w-4" />
                                    Clinical Notes
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="grid gap-6">
                                {activeTab === 'timeline' ? (
                                    <div className="space-y-6">
                                        {/* Modular Timeline Component */}
                                        <EnhancedPatientTimeline
                                            patientId={selectedPatient.patientId}
                                            doctorId={doctorId}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Modular Clinical Notes Panel */}
                                        <ClinicalNotesPanel
                                            patientId={selectedPatient.patientId}
                                            doctorId={doctorId}
                                            doctorName={doctorName}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Emergency Access Modal */}
            {showEmergencyModal && selectedPatient && (
                <EmergencyAccessModal
                    patientName={selectedPatient.patientName}
                    onClose={() => setShowEmergencyModal(false)}
                    onSubmit={(justification) => handleEmergencySubmit(justification)}
                />
            )}

            {/* Referral Modal */}
            {showReferralModal && selectedPatient && (
                <ReferralModal
                    patientId={selectedPatient.patientId}
                    patientName={selectedPatient.patientName}
                    currentDoctorId={doctorId}
                    currentDoctorName={doctorName}
                    onClose={() => setShowReferralModal(false)}
                    onSuccess={() => {
                        // Optional: Refresh patient list or show toast
                    }}
                />
            )}
        </div>
    );
}
