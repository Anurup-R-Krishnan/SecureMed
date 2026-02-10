'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, User, XCircle, CheckCircle, Activity, Loader2, AlertCircle } from 'lucide-react';
import { appointmentService, Appointment } from '@/services/appointments';
import { useToast } from '@/hooks/use-toast';

export default function MyAppointments() {
    const { toast } = useToast();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<number | null>(null);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const data = await appointmentService.getAppointments();
            setAppointments(data);
        } catch (error) {
            console.error('Failed to fetch appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    const handleCancel = async (apt: Appointment) => {
        if (!confirm(`Cancel appointment with ${apt.doctor_name} on ${apt.appointment_date}?`)) return;
        setCancellingId(apt.id);
        try {
            await appointmentService.cancelAppointment(apt.id, 'Cancelled by patient');
            toast({ title: 'Appointment Cancelled', description: `Your appointment with ${apt.doctor_name} has been cancelled.` });
            fetchAppointments();
        } catch (error: any) {
            toast({ title: 'Error', description: error?.response?.data?.error || 'Failed to cancel appointment.', variant: 'destructive' });
        } finally {
            setCancellingId(null);
        }
    };

    const formatTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'in_progress': return <Activity className="h-4 w-4 text-amber-500 animate-pulse" />;
            case 'confirmed': return <CheckCircle className="h-4 w-4 text-cyan-500" />;
            case 'cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'no_show': return <AlertCircle className="h-4 w-4 text-gray-500" />;
            default: return <Clock className="h-4 w-4 text-blue-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            scheduled: 'bg-blue-500/10 text-blue-600',
            confirmed: 'bg-cyan-500/10 text-cyan-600',
            in_progress: 'bg-amber-500/10 text-amber-600',
            completed: 'bg-green-500/10 text-green-600',
            cancelled: 'bg-red-500/10 text-red-600',
            no_show: 'bg-gray-500/10 text-gray-600',
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-500/10 text-gray-600'}`}>
                {getStatusIcon(status)}
                {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const now = new Date();
    const upcoming = appointments
        .filter(a => {
            const d = new Date(`${a.appointment_date}T${a.appointment_time}`);
            return d >= now && !['cancelled', 'completed', 'no_show'].includes(a.status);
        })
        .sort((a, b) => new Date(`${a.appointment_date}T${a.appointment_time}`).getTime() - new Date(`${b.appointment_date}T${b.appointment_time}`).getTime());

    const past = appointments
        .filter(a => {
            const d = new Date(`${a.appointment_date}T${a.appointment_time}`);
            return d < now || ['cancelled', 'completed', 'no_show'].includes(a.status);
        })
        .sort((a, b) => new Date(`${b.appointment_date}T${b.appointment_time}`).getTime() - new Date(`${a.appointment_date}T${a.appointment_time}`).getTime());

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const renderAppointmentCard = (apt: Appointment, showCancel: boolean) => (
        <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-border bg-card rounded-xl shadow-sm gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <p className="font-bold text-foreground">{apt.doctor_name}</p>
                        <p className="text-sm text-muted-foreground">{apt.doctor_specialty}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(apt.appointment_date)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatTime(apt.appointment_time)}</span>
                    {apt.hospital && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {apt.hospital}</span>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Reason: {apt.reason}</p>
            </div>
            <div className="flex items-center gap-3">
                {getStatusBadge(apt.status)}
                {showCancel && !['completed', 'cancelled', 'no_show'].includes(apt.status) && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => handleCancel(apt)}
                        disabled={cancellingId === apt.id}
                    >
                        {cancellingId === apt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                        Cancel
                    </Button>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Upcoming */}
            <div>
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Upcoming Appointments ({upcoming.length})
                </h3>
                {upcoming.length > 0 ? (
                    <div className="space-y-3">
                        {upcoming.map(apt => renderAppointmentCard(apt, true))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-muted/30 rounded-xl border border-dashed border-border">
                        <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-muted-foreground">No upcoming appointments</p>
                    </div>
                )}
            </div>

            {/* Past */}
            {past.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        Past Appointments ({past.length})
                    </h3>
                    <div className="space-y-3">
                        {past.map(apt => renderAppointmentCard(apt, false))}
                    </div>
                </div>
            )}
        </div>
    );
}
