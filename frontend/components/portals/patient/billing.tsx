'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, Filter, CreditCard, TrendingUp, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getPatientAppointments } from '@/lib/services/appointment-service';

export default function PatientBilling({ patientId = 'pat-1' }: { patientId?: string }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const data = await getPatientAppointments(patientId);
        setAppointments(data);
      } catch (error) {
        console.error('Failed to fetch billing data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [patientId]);

  const totalBilled = appointments.reduce((sum, apt) => sum + (apt.fee || 0), 0);
  const totalPaid = appointments
    .filter(apt => apt.status === 'COMPLETED' || apt.status === 'PAID')
    .reduce((sum, apt) => sum + (apt.fee || 0), 0);
  const pending = totalBilled - totalPaid;

  return (
    <div className="space-y-6">
      {/* Billing Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total Billed</p>
              <p className="text-3xl font-bold text-foreground mt-2">₹{totalBilled}</p>
            </div>
            <CreditCard className="h-8 w-8 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total Paid</p>
              <p className="text-3xl font-bold text-primary mt-2">₹{totalPaid}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Pending</p>
              <p className="text-3xl font-bold text-destructive mt-2">₹{pending}</p>
            </div>
            <CreditCard className="h-8 w-8 text-destructive opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Next Due</p>
              <p className="text-2xl font-bold text-foreground mt-2">N/A</p>
            </div>
            <CreditCard className="h-8 w-8 text-muted-foreground opacity-20" />
          </div>
        </Card>
      </div>

      {/* Invoices */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground">Invoices</h3>
          <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-foreground">Invoice ID</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Service</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Doctor</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></td></tr>
              ) : appointments.length > 0 ? (
                appointments.map((apt) => (
                  <tr key={apt.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-foreground">INV-{apt.id}</td>
                    <td className="py-3 px-4 text-foreground">{apt.reasonForVisit || 'Consultation'}</td>
                    <td className="py-3 px-4 text-muted-foreground">{apt.doctorName}</td>
                    <td className="py-3 px-4 text-muted-foreground">{apt.date}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">₹{apt.fee || 0}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${apt.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {apt.status === 'COMPLETED' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="text-primary flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button variant="ghost" size="sm" className="text-primary flex items-center gap-1" onClick={() => alert('Download starting...')}>
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="text-center py-4 text-muted-foreground italic">No billing records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payment Methods */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-6">Payment Methods</h3>
        <div className="space-y-3">
          <div className="p-4 border border-border rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Credit Card</p>
                <p className="text-sm text-muted-foreground">**** **** **** 4242</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Edit</Button>
          </div>
        </div>
      </Card>

      {/* Insurance Info */}
      <Card className="p-6 bg-primary/5 border-l-4 border-l-primary">
        <h3 className="text-lg font-semibold text-foreground mb-4">Insurance Information</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-muted-foreground text-sm">Insurance Provider</p>
            <p className="font-semibold text-foreground">ICICI Lombard Health Plus</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Policy Number</p>
            <p className="font-semibold text-foreground">POL-2024-ABC123456</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
