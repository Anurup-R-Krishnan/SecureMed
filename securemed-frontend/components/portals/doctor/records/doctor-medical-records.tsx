'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Eye, FileText, Pill, Stethoscope, Search, Calendar, User, Plus } from 'lucide-react';
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface DoctorMedicalRecordsProps {
  patientId?: string;
}

export default function DoctorMedicalRecords({ patientId }: DoctorMedicalRecordsProps) {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const urlPatientId = searchParams?.get('patient_id') || '';
  const resolvedPatientId = patientId || urlPatientId || '';
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRecord, setNewRecord] = useState({
    patient_id: resolvedPatientId,
    record_type: '',
    record_date: new Date().toISOString().slice(0, 10),
    diagnosis: '',
    notes: '',
  });
  const [newFile, setNewFile] = useState<File | null>(null);

  useEffect(() => {
    if (!searchParams) return;
    const shouldOpen = searchParams.get('new') === '1';
    const initialType = searchParams.get('type');
    if (shouldOpen) {
      setCreateOpen(true);
    }
    if (initialType) {
      setNewRecord((prev) => ({ ...prev, record_type: initialType }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (resolvedPatientId) {
      setNewRecord((prev) => ({ ...prev, patient_id: resolvedPatientId }));
    }
  }, [resolvedPatientId]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchRecords = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search?.trim()) {
        params.search = search.trim();
      }
      if (resolvedPatientId?.trim()) {
        params.patient_id = resolvedPatientId.trim();
      }

      const [recordsResponse, prescriptionsResponse] = await Promise.all([
        api.get('/medical-records/records/', { params }),
        api.get('/medical-records/prescriptions/'),
      ]);

      const records = Array.isArray(recordsResponse.data)
        ? recordsResponse.data
        : (recordsResponse.data?.results ?? []);
      const rx = Array.isArray(prescriptionsResponse.data)
        ? prescriptionsResponse.data
        : (prescriptionsResponse.data?.results ?? []);

      setMedicalRecords(records);
      setPrescriptions(rx);
    } catch (error) {
      console.error('Failed to fetch doctor medical records', error);
      setMedicalRecords([]);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, [resolvedPatientId]);

  useEffect(() => {
    fetchRecords(debouncedSearch);
  }, [resolvedPatientId, debouncedSearch, fetchRecords]);

  const filteredRecords = medicalRecords.filter(record => {
    const matchesFilter = filterType === 'all' || record.record_type === filterType;
    return matchesFilter;
  });

  const recordTypes = [...new Set(medicalRecords.map(r => r.record_type))];

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.record_type || !newRecord.record_date || !newRecord.diagnosis || !newRecord.patient_id) {
      toast({ title: 'Missing fields', description: 'Patient, type, date, and diagnosis are required.', variant: 'destructive' });
      return;
    }
    try {
      setCreating(true);
      const formData = new FormData();
      formData.append('patient', String(newRecord.patient_id));
      formData.append('record_type', newRecord.record_type);
      formData.append('record_date', newRecord.record_date);
      formData.append('diagnosis', newRecord.diagnosis);
      if (newRecord.notes) formData.append('notes', newRecord.notes);
      if (newFile) formData.append('file', newFile);

      await api.post('/medical-records/records/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast({ title: 'Record created', description: 'Medical record saved successfully.' });
      setCreateOpen(false);
      setNewRecord({
        patient_id: patientId || '',
        record_type: '',
        record_date: new Date().toISOString().slice(0, 10),
        diagnosis: '',
        notes: '',
      });
      setNewFile(null);
      fetchRecords(debouncedSearch);
    } catch (error: any) {
      toast({ title: 'Create failed', description: error?.response?.data?.error || 'Could not create record.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Medical Records</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {resolvedPatientId ? 'Patient medical history and records' : 'Manage your practice and patients'}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Record
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold text-foreground">{medicalRecords.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Pill className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Prescriptions</p>
              <p className="text-2xl font-bold text-foreground">{prescriptions.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="text-sm font-bold text-foreground">
                {medicalRecords.length > 0 ? medicalRecords[0].record_date : 'N/A'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <User className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Patients</p>
              <p className="text-2xl font-bold text-foreground">
                {[...new Set(medicalRecords.map(r => r.patient))].length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Medical Record</DialogTitle>
            <DialogDescription>Create a new clinical record for a patient.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRecord} className="space-y-4">
            {!resolvedPatientId && (
              <div className="space-y-2">
                <Label htmlFor="patient-id">Patient ID (numeric)</Label>
                <Input
                  id="patient-id"
                  value={newRecord.patient_id}
                  onChange={(e) => setNewRecord((prev) => ({ ...prev, patient_id: e.target.value }))}
                  placeholder="e.g. 12"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="record-type">Record Type</Label>
                <select
                  id="record-type"
                  value={newRecord.record_type}
                  onChange={(e) => setNewRecord((prev) => ({ ...prev, record_type: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select type</option>
                  <option value="consultation">Consultation</option>
                  <option value="lab_report">Lab Report</option>
                  <option value="prescription">Prescription</option>
                  <option value="imaging">Imaging</option>
                  <option value="surgery">Surgery</option>
                  <option value="discharge">Discharge Summary</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="record-date">Date</Label>
                <Input
                  id="record-date"
                  type="date"
                  value={newRecord.record_date}
                  onChange={(e) => setNewRecord((prev) => ({ ...prev, record_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Input
                id="diagnosis"
                value={newRecord.diagnosis}
                onChange={(e) => setNewRecord((prev) => ({ ...prev, diagnosis: e.target.value }))}
                placeholder="Primary diagnosis"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newRecord.notes}
                onChange={(e) => setNewRecord((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Clinical notes (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="record-file">Attach File</Label>
              <Input
                id="record-file"
                type="file"
                onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Saving...' : 'Create Record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Patient Records</h3>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by patient name, patient ID (e.g. P-0008), diagnosis..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="all">All Types</option>
                {recordTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="h-8 w-8 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-3" />
                <p className="text-muted-foreground">Loading records...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No medical records found</p>
                {!patientId && (
                  <p className="text-sm mt-2">
                    {searchTerm ? `No records matching "${searchTerm}"` : 'Search for a patient by name or ID to view their records'}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecords.map((record) => (
                  <div
                    key={record.id}
                    className={`border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer ${selectedRecord?.id === record.id ? 'bg-muted/50 border-primary' : ''
                      }`}
                    onClick={() => setSelectedRecord(record)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <Stethoscope className="h-5 w-5 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h4 className="font-semibold text-foreground">{record.record_type_display || 'Medical Record'}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{record.diagnosis}</p>
                          </div>
                          {(record.file_url || record.file) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = record.file_url || record.file;
                                if (url) {
                                  window.open(url, '_blank');
                                }
                              }}
                              className="flex-shrink-0"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {!patientId && record.patient_name && (
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <User className="h-3 w-3" />
                              {record.patient_name}
                              {record.patient_display_id && (
                                <span className="text-muted-foreground font-normal ml-1">({record.patient_display_id})</span>
                              )}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {record.record_date}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {record.doctor_name || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-6">
              <Pill className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Prescriptions</h3>
            </div>

            {selectedRecord ? (
              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Selected Record</p>
                  <p className="font-semibold text-foreground">{selectedRecord.record_type_display}</p>
                  <p className="text-sm text-muted-foreground">{selectedRecord.record_date}</p>
                </div>

                {selectedRecord.prescriptions && selectedRecord.prescriptions.length > 0 ? (
                  <div className="space-y-3">
                    {selectedRecord.prescriptions.map((rx: any) => (
                      <div key={rx.id} className="p-3 border border-border rounded-lg bg-background">
                        <p className="font-medium text-foreground">{rx.medication_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{rx.dosage}</p>
                        <p className="text-xs text-muted-foreground">{rx.frequency}</p>
                        {rx.duration && (
                          <p className="text-xs text-muted-foreground">{rx.duration}</p>
                        )}
                        {rx.is_signed && (
                          <span className="inline-block mt-2 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            Signed
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No prescriptions for this record</p>
                )}

                {selectedRecord.notes && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Clinical Notes</p>
                    <p className="text-sm text-foreground">{selectedRecord.notes}</p>
                  </div>
                )}
              </div>
            ) : prescriptions.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">Recent prescriptions</p>
                {prescriptions.slice(0, 5).map((rx) => (
                  <div key={rx.id} className="p-3 border border-border rounded-lg bg-background">
                    <p className="font-medium text-foreground">{rx.medication_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{rx.dosage} - {rx.frequency}</p>
                    {rx.patient_name && (
                      <p className="text-xs text-muted-foreground mt-1">Patient: {rx.patient_name}</p>
                    )}
                    <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${rx.status === 'active' || rx.status === 'signed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                      }`}>
                      {rx.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Pill className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No prescriptions</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
