'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appointmentService, Appointment as BaseAppointment } from '@/services/appointments';
import HealthScoreCard from './health-score-card';

// Extend Appointment type locally if needed or just cast
interface Appointment extends Omit<BaseAppointment, 'doctor_name'> {
    specialty?: string;
    doctor_name?: string;
}
import VitalsRow from './vitals-row';
import QuickActions from './quick-actions';
import { getDashboardStats } from '@/lib/api';

interface PatientDashboardProps {
    onNavigate: (tab: any) => void;
}

export default function PatientDashboard({ onNavigate }: PatientDashboardProps) {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [dashboardStats, setDashboardStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Dashboard Stats (Health Score, Vitals)
                try {
                    const statsRes = await getDashboardStats();
                    setDashboardStats(statsRes.data);
                } catch (e) {
                    console.error("Failed to fetch dashboard stats", e);
                }

                // Fetch Appointments
                const appts = await appointmentService.getAppointments();
                const now = new Date();
                const upcoming = appts.filter((apt: Appointment) => {
                    const aptDate = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
                    return aptDate >= now && (apt.status === 'scheduled' || apt.status === 'confirmed');
                });
                setAppointments(upcoming.slice(0, 3)); // Show max 3 for cleaner UI
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
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

    // Default vitals if API fails or no data
    const vitals = dashboardStats?.vitals || {
        heartRate: 0,
        systolicBp: 0,
        diastolicBp: 0,
        weight: 0
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Header Section */}
            <div className="mb-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Welcome back, {dashboardStats?.patient_name?.split(' ')[0] || 'Patient'}
                </h1>
                <p className="text-muted-foreground text-sm">Here&apos;s your health overview for today.</p>
            </div>

            {/* Main Stats Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column: Health Score */}
                <div className="lg:col-span-1 h-64">
                    <HealthScoreCard score={dashboardStats?.health_score || 0} />
                </div>

                {/* Right Column: Vitals & Quick Actions */}
                <div className="lg:col-span-2 space-y-6">
                    <VitalsRow
                        vitals={{
                            heartRate: vitals.heart_rate || 0,
                            systolicBp: vitals.systolic_bp || 0,
                            diastolicBp: vitals.diastolic_bp || 0,
                            weight: vitals.weight || 0
                        }}
                        history={dashboardStats?.vitals_history || []}
                    />

                    <QuickActions onNavigate={onNavigate} />
                </div>
            </div>

            {/* Appointments Section */}
            <div className="grid gap-6">
                {/* Upcoming Appointments */}
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
                                    <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-4 shrink-0">
                                        Join
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
