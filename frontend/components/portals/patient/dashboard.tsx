'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, MapPin, Heart, TrendingUp, AlertCircle, Plus, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getPatientAppointments } from '@/lib/services/appointment-service';

// Mock data
const upcomingAppointments = [
  {
    id: 1,
    doctor: 'Dr. Amit Patel',
    specialty: 'Cardiology',
    date: 'Tomorrow',
    time: '10:00 AM',
    hospital: 'Fortis Hospital Delhi',
    type: 'Follow-up',
  },
  {
    id: 2,
    doctor: 'Dr. Sarah Johnson',
    specialty: 'Neurology',
    date: 'Feb 5, 2025',
    time: '2:30 PM',
    hospital: 'Fortis Hospital Mumbai',
    type: 'Consultation',
  },
];

const healthMetrics = [
  { label: 'Blood Pressure', value: '120/80', status: 'Normal', icon: '💓' },
  { label: 'Heart Rate', value: '72 bpm', status: 'Normal', icon: '❤️' },
  { label: 'Weight', value: '72 kg', status: 'Healthy', icon: '⚖️' },
  { label: 'BMI', value: '23.5', status: 'Normal', icon: '📊' },
];

const recentLabResults = [
  { test: 'Blood Test', date: 'Jan 15, 2025', status: 'Normal', file: 'PDF' },
  { test: 'COVID-19 Antibody', date: 'Jan 10, 2025', status: 'Negative', file: 'PDF' },
  { test: 'Thyroid Profile', date: 'Dec 28, 2024', status: 'Normal', file: 'PDF' },
];

export default function PatientDashboard({
  patientId = 'pat-1',
  onBookAppointment
}: {
  patientId?: string;
  onBookAppointment?: () => void;
}) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const data = await getPatientAppointments(patientId);
        setAppointments(data.filter((a: any) => a.status !== 'CANCELLED'));
      } catch (error) {
        console.error('Failed to fetch appointments', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [patientId]);
  return (
    <div className="space-y-6">
      {/* Health Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        {healthMetrics.map((metric, idx) => (
          <Card key={idx} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="text-3xl">{metric.icon}</div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                {metric.status}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mb-1">{metric.label}</p>
            <p className="text-2xl font-bold text-foreground">{metric.value}</p>
          </Card>
        ))}
      </div>

      {/* Upcoming Appointments */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground">Upcoming Appointments</h3>
          <Button size="sm" className="flex items-center gap-2" onClick={onBookAppointment}>
            <Plus className="h-4 w-4" />
            Book Appointment
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">Loading appointments...</div>
        ) : appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 mb-4 md:mb-0">
                  <h4 className="font-semibold text-foreground text-lg">{apt.doctorName}</h4>
                  <p className="text-primary font-medium text-sm mb-2">Cardiology</p>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {apt.date}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {apt.startTime}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Fortis Hospital
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-sm font-medium px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                    {apt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No upcoming appointments</p>
          </div>
        )}
      </Card>

      {/* Recent Lab Results */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-6">Recent Lab Results</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-foreground">Test Name</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentLabResults.map((result, idx) => (
                <tr key={idx} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4 text-foreground">{result.test}</td>
                  <td className="py-3 px-4 text-muted-foreground">{result.date}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                      {result.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm" className="text-primary flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
