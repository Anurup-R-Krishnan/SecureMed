'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, Filter, CreditCard, TrendingUp } from 'lucide-react';

const invoices = [
  {
    id: 'INV-2025-001',
    date: 'Jan 15, 2025',
    doctor: 'Dr. Amit Patel',
    amount: 500,
    status: 'Paid',
    service: 'Cardiology Consultation',
  },
  {
    id: 'INV-2025-002',
    date: 'Dec 28, 2024',
    doctor: 'Dr. Sarah Johnson',
    amount: 750,
    status: 'Paid',
    service: 'Lab Tests',
  },
  {
    id: 'INV-2025-003',
    date: 'Dec 10, 2024',
    doctor: 'Dr. Rajesh Kumar',
    amount: 1200,
    status: 'Paid',
    service: 'Orthopedic Procedure',
  },
  {
    id: 'INV-2025-004',
    date: 'Nov 25, 2024',
    doctor: 'Dr. Emma Wilson',
    amount: 300,
    status: 'Paid',
    service: 'Pediatric Consultation',
  },
];

const billingSummary = {
  totalBilled: 2750,
  totalPaid: 2750,
  pending: 0,
  nextDueDate: 'N/A',
};

export default function PatientBilling() {
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
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-foreground">{invoice.id}</td>
                  <td className="py-3 px-4 text-foreground">{invoice.service}</td>
                  <td className="py-3 px-4 text-muted-foreground">Dr. {invoice.doctor.split(' ')[1]}</td>
                  <td className="py-3 px-4 text-muted-foreground">{invoice.date}</td>
                  <td className="py-3 px-4 font-semibold text-foreground">₹{invoice.amount}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                      {invoice.status}
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
              ))}
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

          <div className="p-4 border border-border rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="font-semibold text-foreground">Debit Card</p>
                <p className="text-sm text-muted-foreground">**** **** **** 5555</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Edit</Button>
          </div>
        </div>

        <Button className="w-full mt-6 bg-transparent" variant="outline">
          Add New Payment Method
        </Button>
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
        <Button className="mt-6 bg-transparent" variant="outline">
          View Insurance Details
        </Button>
      </Card>
    </div>
  );
}
