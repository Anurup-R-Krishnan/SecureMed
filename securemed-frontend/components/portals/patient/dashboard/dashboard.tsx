'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, MapPin, Heart, TrendingUp, AlertCircle, Plus, Download, Activity } from 'lucide-react';
import { appointmentService, Appointment } from '@/services/appointments';
import { patientService } from '@/services/patients';

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const appts = await appointmentService.getAppointments();
        // Filter to upcoming only
        const now = new Date();
        const upcoming = appts.filter((apt: Appointment) => {
          const aptDate = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
          return aptDate >= now && (apt.status === 'scheduled' || apt.status === 'confirmed');
        });
        setAppointments(upcoming.slice(0, 5)); // Show max 5
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
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <div className="flex items-start justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm mb-1">Upcoming Appointments</p>
          <p className="text-3xl font-black text-foreground">{appointments.length}</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <div className="flex items-start justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm mb-1">Health Score</p>
          <p className="text-3xl font-black text-foreground">Good</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <div className="flex items-start justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm mb-1">Last Checkup</p>
          <p className="text-3xl font-black text-foreground">Recent</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <div className="flex items-start justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Heart className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm mb-1">Active Prescriptions</p>
          <p className="text-3xl font-black text-foreground">0</p>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground">Upcoming Appointments</h3>
          <Button size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Book Appointment
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 rounded-full border-2 border-muted border-t-primary animate-spin" />
          </div>
        ) : appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 mb-4 md:mb-0">
                  <h4 className="font-semibold text-foreground text-lg">{apt.doctor_name}</h4>
                  <p className="text-primary font-medium text-sm mb-2">{apt.doctor_specialty}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(apt.appointment_date)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {formatTime(apt.appointment_time)}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {apt.hospital || 'SecureMed Hospital'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Reschedule
                  </Button>
                  <Button size="sm" className="bg-primary">
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground font-medium">No upcoming appointments</p>
            <p className="text-sm text-muted-foreground mt-1">Book an appointment to get started</p>
          </div>
        )}
      </Card>

      {/* Health Tips */}
      <Card className="p-6 border-l-4 border-l-primary bg-primary/5">
        <div className="flex gap-4">
          <Heart className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground mb-2">Health Tip</h3>
            <p className="text-muted-foreground text-sm">
              Regular check-ups help prevent health issues early. Schedule your annual health
              screening to ensure your well-being.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
