'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, Filter, CreditCard, TrendingUp } from 'lucide-react';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

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
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [insuranceOpen, setInsuranceOpen] = useState(false);
  const [insuranceLoading, setInsuranceLoading] = useState(false);
  const [insuranceProfile, setInsuranceProfile] = useState<any | null>(null);

  const fetchBillingData = async (params?: Record<string, string>) => {
    try {
      setLoading(true);
      const response = await api.get('/billing/invoices/', { params });
      setInvoices(response.data.invoices || []);
      setBillingSummary(response.data.summary);
    } catch (error: any) {
      if (error?.response?.status !== 403 && error?.response?.status !== 401) {
        console.error('Failed to fetch billing data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const applyFilters = async () => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    await fetchBillingData(params);
  };

  const clearFilters = async () => {
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    await fetchBillingData();
  };

  const handleViewInvoice = async (invoiceId: string) => {
    try {
      setDetailLoading(true);
      setDetailOpen(true);
      const response = await api.get(`/billing/invoices/${invoiceId}/`);
      setSelectedInvoice(response.data);
    } catch (error) {
      console.error('Failed to fetch invoice detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await api.get(`/billing/invoices/${invoiceId}/download/`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoiceId}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download invoice:', error);
    }
  };

  const handleViewInsurance = async () => {
    setInsuranceOpen(true);
    if (patient) {
      setInsuranceProfile(patient);
      return;
    }
    try {
      setInsuranceLoading(true);
      const response = await api.get('/patients/profile/');
      setInsuranceProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch insurance profile:', error);
    } finally {
      setInsuranceLoading(false);
    }
  };

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
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 bg-transparent"
            onClick={() => setShowFilters((prev) => !prev)}
          >
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
        {showFilters && (
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
            >
              <option value="">All Statuses</option>
              <option value="issued">Issued</option>
              <option value="pending">Pending</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={applyFilters}>Apply</Button>
              <Button size="sm" variant="outline" onClick={clearFilters}>Clear</Button>
            </div>
          </div>
        )}

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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary flex items-center gap-1"
                          onClick={() => handleViewInvoice(invoice.invoice_id)}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary flex items-center gap-1"
                          onClick={() => handleDownloadInvoice(invoice.invoice_id)}
                        >
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
        <Button className="mt-6 bg-transparent" variant="outline" onClick={handleViewInsurance}>
          View Insurance Details
        </Button>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : selectedInvoice ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice ID</span>
                <span className="font-mono">{selectedInvoice.invoice_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{selectedInvoice.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issue Date</span>
                <span>{selectedInvoice.issue_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date</span>
                <span>{selectedInvoice.due_date || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Doctor</span>
                <span>{selectedInvoice.doctor_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">₹{selectedInvoice.total_amount}</span>
              </div>
              {Array.isArray(selectedInvoice.items) && selectedInvoice.items.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Items</p>
                  <ul className="space-y-1">
                    {selectedInvoice.items.map((item: any) => (
                      <li key={item.id} className="flex justify-between">
                        <span>{item.description || 'Service'}</span>
                        <span>₹{item.total_amount}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Invoice not found.</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={insuranceOpen} onOpenChange={setInsuranceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insurance Details</DialogTitle>
          </DialogHeader>
          {insuranceLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : insuranceProfile ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider</span>
                <span>{insuranceProfile.insurance_provider || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Policy Number</span>
                <span>{insuranceProfile.insurance_number || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Group Number</span>
                <span>{insuranceProfile.groupNumber || 'N/A'}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No insurance details found.</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInsuranceOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
