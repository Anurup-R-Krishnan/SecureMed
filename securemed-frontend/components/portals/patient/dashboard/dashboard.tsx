'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appointmentService, Appointment as BaseAppointment } from '@/services/appointments';
import HealthScoreCard from './health-score-card';
import VitalsRow from './vitals-row';
import QuickActions from './quick-actions';
import ActivePrescriptionsCard from './active-prescriptions-card';
import LabResultsCard from './lab-results-card';
import RecentRecordsCard from './recent-records-card';
import BillingSummaryCard from './billing-summary-card';
import HealthInsightsCard from './health-insights-card';
import AnatomyEducationCard from './anatomy-education-card';
import { getDashboardStats } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-utils';

interface Appointment extends Omit<BaseAppointment, 'doctor_name'> {
    specialty?: string;
    doctor_name?: string;
}

interface PatientDashboardProps {
    onNavigate: (tab: any, params?: Record<string, string>) => void;
}

export default function PatientDashboard({ onNavigate }: PatientDashboardProps) {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [dashboardStats, setDashboardStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!getAccessToken()) {
                setAppointments([]);
                setDashboardStats(null);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                // Fetch Dashboard Stats (Health Score, Vitals, Prescriptions, Labs, etc.)
                try {
                    const statsRes = await getDashboardStats();
                    setDashboardStats(statsRes.data);
                } catch (e: any) {
                    if (e?.response?.status !== 403 && e?.response?.status !== 401) {
                        console.error("Failed to fetch dashboard stats", e);
                    }
                }

                // Fetch Appointments
                try {
                    const appts = await appointmentService.getAppointments();
                    const now = new Date();
                    const upcoming = appts.filter((apt: Appointment) => {
                        const aptDate = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
                        return aptDate >= now && (apt.status === 'scheduled' || apt.status === 'confirmed');
                    });
                    setAppointments(upcoming.slice(0, 3));
                } catch (e: any) {
                    if (e?.response?.status !== 403 && e?.response?.status !== 401) {
                        console.error("Failed to fetch appointments", e);
                    }
                    setAppointments([]);
                }
            } catch (error) {
                if ((error as any)?.response?.status !== 403 && (error as any)?.response?.status !== 401) {
                    console.error('Error fetching dashboard data:', error);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading dashboard...</div>;
    }

    // Get vitals from backend - no fallback defaults
    const vitals = dashboardStats?.vitals ? {
        heartRate: dashboardStats.vitals.heart_rate,
        systolicBp: dashboardStats.vitals.systolic_bp,
        diastolicBp: dashboardStats.vitals.diastolic_bp,
        weight: dashboardStats.vitals.weight
    } : null;

    return (
        <div className="space-y-8 animate-in fade-in duration-700 ease-out pb-12">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end bg-gradient-to-r from-card to-muted/20 p-8 rounded-[32px] border border-border/60 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                <div className="relative z-10">
                    <h1 className="text-3xl font-black tracking-tight text-foreground mb-2">
                        Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, <br />
                        <span className="text-primary">{dashboardStats?.patient_name?.split(' ')[0] || 'Patient'}</span>
                    </h1>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                        Your Personal Health Command Center
                    </p>
                </div>

                <div className="relative z-10 mt-6 md:mt-0 flex gap-3">
                    <div className="px-4 py-2 bg-background/50 backdrop-blur rounded-full border border-border/50 text-xs font-bold text-muted-foreground shadow-sm">
                        Last Login: Today
                    </div>
                </div>
            </div>

            {/* Row 1: Health Score + Vitals */}
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 h-64">
                    <HealthScoreCard score={dashboardStats?.health_score ?? 0} />
                </div>

                <div className="lg:col-span-2 space-y-6">
                    {vitals ? (
                        <VitalsRow
                            vitals={vitals}
                            history={dashboardStats?.vitals_history || []}
                        />
                    ) : (
                        <div className="text-center p-8 text-muted-foreground">Loading vitals...</div>
                    )}

                    <QuickActions onNavigate={onNavigate} />
                </div>
            </div>

            {/* Row 2: Active Prescriptions + Lab Results */}
            <div className="grid lg:grid-cols-2 gap-6">
                <ActivePrescriptionsCard
                    prescriptions={dashboardStats?.active_prescriptions || []}
                    onNavigate={onNavigate}
                />
                <LabResultsCard
                    results={dashboardStats?.recent_lab_results || []}
                    onNavigate={onNavigate}
                />
            </div>

            {/* Row 3: Health Insights */}
            <HealthInsightsCard insights={dashboardStats?.health_insights || null} />

            {/* Row 4: Anatomy Education & Condition Visualization */}
            <AnatomyEducationCard />

            {/* Row 5: Upcoming Appointments */}
            <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-lg">Upcoming Appointments</h3>
                    <Button variant="link" className="text-primary text-sm h-auto p-0" onClick={() => onNavigate('appointments')}>
                        View all
                    </Button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {appointments.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-muted-foreground bg-white/5 rounded-lg border border-dashed border-white/10">
                            No upcoming appointments.
                            <div className="mt-2">
                                <Button variant="outline" size="sm" onClick={() => onNavigate('appointments')}>Book Now</Button>
                            </div>
                        </div>
                    ) : (
                        appointments.map((apt) => (
                            <div key={apt.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">
                                        {apt.doctor_name ? apt.doctor_name.charAt(4) : 'D'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-foreground truncate">{apt.doctor_name || 'Doctor'}</p>
                                        <p className="text-sm text-muted-foreground truncate">{apt.specialty || 'General Practice'}</p>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(apt.appointment_date)}</span>
                                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(apt.appointment_time)}</span>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-4 shrink-0"
                                    onClick={() => onNavigate('appointments', { join: '1' })}
                                >
                                    Join
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            {/* Row 5: Recent Medical Records + Billing Summary */}
            <div className="grid lg:grid-cols-2 gap-6">
                <RecentRecordsCard
                    records={dashboardStats?.recent_records || []}
                    onNavigate={onNavigate}
                />
                <BillingSummaryCard
                    summary={dashboardStats?.billing_summary || null}
                    onNavigate={onNavigate}
                />
            </div>
        </div>
    );
}
