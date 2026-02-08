'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, Clock, AlertTriangle, RefreshCw, Check, X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { getPatientsColumns, Patient } from './columns';
import { getReferralsColumns } from './referral-columns';
import { referralService, ReferredPatient, Referral } from '@/services/referrals';



interface MyPatientsTableProps {
  patients?: Patient[];
  onSelectPatient: (patient: Patient) => void;
}



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
        <Card className="overflow-hidden border-none shadow-none">
          <DataTable columns={getPatientsColumns({ onSelectPatient })} data={allPatients} />
        </Card>
      ) : (
        /* Pending Referrals Tab */
        <Card className="overflow-hidden border-none shadow-none">
          <DataTable columns={getReferralsColumns({ onAccept: handleAccept, onDecline: handleDecline })} data={pendingReferrals} />
        </Card>
      )}
    </div>
  );
}
