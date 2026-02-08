'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, Filter, CreditCard, TrendingUp } from 'lucide-react';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';

interface PatientBillingProps {
  patient?: any;
}

export default function PatientBilling({ patient }: PatientBillingProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [billingSummary, setBillingSummary] = useState({
    totalBilled: 0,
    totalPaid: 0,
    pending: 0,
    nextDueDate: 'N/A',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        const response = await api.get('/billing/invoices/');
        setInvoices(response.data.invoices);
        setBillingSummary(response.data.summary);
      } catch (error) {
        console.error('Failed to fetch billing data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Billing Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total Billed</p>
              <p className="text-3xl font-bold text-foreground mt-2">₹{billingSummary.totalBilled}</p>
            </div>
            <CreditCard className="h-8 w-8 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total Paid</p>
              <p className="text-3xl font-bold text-primary mt-2">₹{billingSummary.totalPaid}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Pending</p>
              <p className="text-3xl font-bold text-destructive mt-2">₹{billingSummary.pending}</p>
            </div>
            <CreditCard className="h-8 w-8 text-destructive opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Next Due</p>
              <p className="text-2xl font-bold text-foreground mt-2">{billingSummary.nextDueDate}</p>
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
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">No invoices found.</td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-foreground">{invoice.invoice_id}</td>
                    <td className="py-3 px-4 text-foreground">{invoice.service_summary}</td>
                    <td className="py-3 px-4 text-muted-foreground">{invoice.doctor_name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{invoice.issue_date}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">₹{invoice.total_amount}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                        invoice.status === 'pending' || invoice.status === 'issued' ? 'bg-yellow-100 text-yellow-700' :
                          invoice.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1).replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="text-primary flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button variant="ghost" size="sm" className="text-primary flex items-center gap-1">
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payment Methods - Removed Mock Data */}
      {/* <div className="p-6 border border-border rounded-lg text-center text-muted-foreground">
          No payment methods saved.
      </div> */}

      {/* Insurance Info */}
      <Card className="p-6 bg-primary/5 border-l-4 border-l-primary">
        <h3 className="text-lg font-semibold text-foreground mb-4">Insurance Information</h3>
        {patient?.insurance_provider ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-muted-foreground text-sm">Insurance Provider</p>
              <p className="font-semibold text-foreground">{patient.insurance_provider}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Policy Number</p>
              <p className="font-semibold text-foreground">{patient.insurance_number}</p>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">No insurance information available.</div>
        )}
        <Button className="mt-6 bg-transparent" variant="outline">
          View Insurance Details
        </Button>
      </Card>
    </div>
  );
}
