'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, Clock, AlertTriangle, RefreshCw, Check, X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { referralService, ReferredPatient, Referral } from '@/services/referrals';

interface Patient {
  id: string | number;
  name: string;
  age?: number;
  status?: 'Admitted' | 'Outpatient' | 'Observation' | 'Referred';
  lastVisit?: string;
  condition?: string;
  // Referral-specific fields
  referral_id?: string;
  referred_by?: string;
  reason?: string;
  priority?: string;
  access_expires_at?: string;
}

interface MyPatientsTableProps {
  patients?: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

const statusColors: Record<string, string> = {
  Admitted: 'bg-destructive/20 text-destructive',
  Outpatient: 'bg-accent/20 text-accent',
  Observation: 'bg-yellow-500/20 text-yellow-600',
  Referred: 'bg-primary/20 text-primary',
};

const priorityColors: Record<string, string> = {
  routine: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  urgent: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  emergency: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export default function MyPatientsTable({ patients: propPatients, onSelectPatient }: MyPatientsTableProps) {
  const [referredPatients, setReferredPatients] = useState<ReferredPatient[]>([]);
  const [pendingReferrals, setPendingReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'myPatients' | 'pendingReferrals'>('myPatients');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [myPatients, allReferrals] = await Promise.all([
          referralService.getMyPatients(),
          referralService.getReferrals(),
        ]);
        setReferredPatients(myPatients);
        // Filter for pending referrals where current doctor is specialist
        setPendingReferrals(allReferrals.filter(r => r.status === 'pending'));
      } catch (error) {
        console.error('Error fetching patient data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAccept = async (referralId: number) => {
    try {
      await referralService.acceptReferral(referralId);
      // Refresh data
      const [myPatients, allReferrals] = await Promise.all([
        referralService.getMyPatients(),
        referralService.getReferrals(),
      ]);
      setReferredPatients(myPatients);
      setPendingReferrals(allReferrals.filter(r => r.status === 'pending'));
    } catch (error) {
      console.error('Error accepting referral:', error);
    }
  };

  const handleDecline = async (referralId: number) => {
    try {
      await referralService.declineReferral(referralId);
      setPendingReferrals(prev => prev.filter(r => r.id !== referralId));
    } catch (error) {
      console.error('Error declining referral:', error);
    }
  };

  const handleComplete = async (referralId: string) => {
    try {
      // Find the referral by referral_id string
      const patient = referredPatients.find(p => p.referral_id === referralId);
      if (patient) {
        // We need the numeric ID - parse from referral_id or fetch it
        const allReferrals = await referralService.getReferrals();
        const referral = allReferrals.find(r => r.referral_id === referralId);
        if (referral) {
          await referralService.completeReferral(referral.id);
          setReferredPatients(prev => prev.filter(p => p.referral_id !== referralId));
        }
      }
    } catch (error) {
      console.error('Error completing referral:', error);
    }
  };

  // Combine prop patients with referred patients
  const allPatients: Patient[] = [
    ...(propPatients || []),
    ...referredPatients.map(rp => ({
      id: rp.id,
      name: rp.name,
      status: 'Referred' as const,
      lastVisit: new Date(rp.created_at).toLocaleDateString(),
      condition: rp.reason,
      referral_id: rp.referral_id,
      referred_by: rp.referred_by,
      priority: rp.priority,
      access_expires_at: rp.access_expires_at,
    })),
  ];

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">My Patients</h1>
          <p className="text-muted-foreground">
            Manage patients and incoming referrals
          </p>
        </div>
        {pendingReferrals.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-600">
              {pendingReferrals.length} pending referral{pendingReferrals.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'myPatients' ? 'default' : 'outline'}
          onClick={() => setActiveTab('myPatients')}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          My Patients ({allPatients.length})
        </Button>
        <Button
          variant={activeTab === 'pendingReferrals' ? 'default' : 'outline'}
          onClick={() => setActiveTab('pendingReferrals')}
          className="gap-2"
        >
          <Clock className="h-4 w-4" />
          Pending Referrals ({pendingReferrals.length})
        </Button>
      </div>

      {activeTab === 'myPatients' ? (
        <Card className="overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-6 gap-4 border-b border-border bg-muted p-4">
            <div className="font-semibold text-foreground">Patient</div>
            <div className="font-semibold text-foreground">Status</div>
            <div className="font-semibold text-foreground">Priority</div>
            <div className="font-semibold text-foreground">Referred By</div>
            <div className="font-semibold text-foreground">Access Expires</div>
            <div className="font-semibold text-foreground">Action</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-border">
            {allPatients.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No patients assigned. Accept referrals to add patients to your list.
              </div>
            ) : (
              allPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="grid grid-cols-6 gap-4 p-4 hover:bg-muted/50 transition-colors items-center"
                >
                  <div>
                    <p className="font-medium text-foreground">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">{patient.condition}</p>
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColors[patient.status || 'Referred']
                      }`}>
                      {patient.status}
                    </span>
                  </div>
                  <div>
                    {patient.priority && (
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityColors[patient.priority]
                        }`}>
                        {patient.priority}
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {patient.referred_by || '-'}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {patient.access_expires_at
                      ? new Date(patient.access_expires_at).toLocaleDateString()
                      : '-'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onSelectPatient(patient)}
                    >
                      View
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                    {patient.referral_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleComplete(patient.referral_id!)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : (
        /* Pending Referrals Tab */
        <Card className="overflow-hidden">
          <div className="grid grid-cols-5 gap-4 border-b border-border bg-muted p-4">
            <div className="font-semibold text-foreground">Patient</div>
            <div className="font-semibold text-foreground">Referred By</div>
            <div className="font-semibold text-foreground">Priority</div>
            <div className="font-semibold text-foreground">Reason</div>
            <div className="font-semibold text-foreground">Actions</div>
          </div>

          <div className="divide-y divide-border">
            {pendingReferrals.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No pending referrals.
              </div>
            ) : (
              pendingReferrals.map((referral) => (
                <div
                  key={referral.id}
                  className="grid grid-cols-5 gap-4 p-4 hover:bg-muted/50 transition-colors items-center"
                >
                  <div>
                    <p className="font-medium text-foreground">{referral.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{referral.patient_display_id}</p>
                  </div>
                  <div className="text-muted-foreground">
                    {referral.referring_doctor_name}
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityColors[referral.priority]
                      }`}>
                      {referral.priority_display}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {referral.reason}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(referral.id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDecline(referral.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
