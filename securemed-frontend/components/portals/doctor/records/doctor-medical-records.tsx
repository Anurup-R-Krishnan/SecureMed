'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, FileText, Pill, Stethoscope, Search, Calendar, User, Plus, Filter } from 'lucide-react';
import api from '@/lib/api';

interface DoctorMedicalRecordsProps {
  patientId?: string;
}

export default function DoctorMedicalRecords({ patientId }: DoctorMedicalRecordsProps) {
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchRecords = async (search?: string) => {
    setLoading(true);
    try {
      const params: any = {};
      if (patientId) params.patient_id = patientId;
      if (search) params.search = search;

      const [recordsRes, prescriptionsRes] = await Promise.all([
        api.get('/medical-records/records/', { params }),
        api.get('/medical-records/prescriptions/', { params: patientId ? { patient_id: patientId } : {} })
      ]);

      const recordsData = Array.isArray(recordsRes.data) ? recordsRes.data : (recordsRes.data.results || []);
      const prescriptionsData = Array.isArray(prescriptionsRes.data) ? prescriptionsRes.data : (prescriptionsRes.data.results || []);

      setMedicalRecords(recordsData);
      setPrescriptions(prescriptionsData);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(debouncedSearch);
  }, [patientId, debouncedSearch]);

  const filteredRecords = medicalRecords.filter(record => {
    const matchesFilter = filterType === 'all' || record.record_type === filterType;
    return matchesFilter;
  });

  const recordTypes = [...new Set(medicalRecords.map(r => r.record_type))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Medical Records</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {patientId ? 'Patient medical history and records' : 'Manage your practice and patients'}
          </p>
        </div>
        <Button className="gap-2">
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
                          {record.file && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(record.file, '_blank');
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
