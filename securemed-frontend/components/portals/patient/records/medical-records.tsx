'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, FileText, Pill, Stethoscope, FileJson, Search, Filter, Calendar, User, Download } from 'lucide-react';
import { medicalRecordService } from '@/services/appointments';
import { drugInteractionService } from '@/services/drug-interactions';
import FHIRExportButton from '@/components/portals/patient/records/fhir-export-button';

interface MedicalRecordsProps {
  patientId?: string;
}

export default function MedicalRecords({ patientId }: MedicalRecordsProps) {
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [adherenceLoading, setAdherenceLoading] = useState<number | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const [recordsData, prescriptionsData] = await Promise.all([
        medicalRecordService.getMedicalRecords(),
        medicalRecordService.getPrescriptions()
      ]);
      setMedicalRecords(recordsData);
      setPrescriptions(prescriptionsData);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  /* Pagination / Infinite Scroll State */
  const [displayCount, setDisplayCount] = useState(5);
  const filteredRecords = medicalRecords.filter(record => {
    const matchesSearch = searchTerm === '' ||
      record.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.record_type_display?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterType === 'all' || record.record_type === filterType;

    return matchesSearch && matchesFilter;
  });

  const visibleRecords = filteredRecords.slice(0, displayCount);
  const hasMore = displayCount < filteredRecords.length;

  const loadMore = () => {
    setDisplayCount(prev => prev + 5);
  };

  const recordTypes = [...new Set(medicalRecords.map(r => r.record_type))];
  const activePrescriptions = prescriptions.filter((rx) => ['signed', 'dispensed'].includes(rx.status));
  const pastPrescriptions = prescriptions.filter((rx) => ['cancelled'].includes(rx.status));

  const handleMarkTaken = async (rxId: number) => {
    setAdherenceLoading(rxId);
    try {
      await medicalRecordService.logMedicationTaken(rxId);
    } catch (error) {
      console.error('Failed to log adherence', error);
    } finally {
      setAdherenceLoading(null);
    }
  };

  const handleDownloadInteractionReport = async () => {
    try {
      setDownloadingReport(true);
      setReportError('');
      const blob = await drugInteractionService.downloadReportPDF();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `interaction_report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setReportError('No interaction report available yet. Run Medication Safety Checker first.');
      } else if (error?.response?.status === 401) {
        setReportError('Session expired. Please log in again.');
      } else {
        setReportError('Could not download interaction report right now.');
      }
    } finally {
      setDownloadingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Medical Records</h2>
          <p className="text-sm text-muted-foreground mt-1">View your medical history and prescriptions</p>
        </div>
        <FHIRExportButton patientId={patientId} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <p className="text-sm text-muted-foreground">Active Medications</p>
              <p className="text-2xl font-bold text-foreground">{activePrescriptions.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Visit</p>
              <p className="text-lg font-bold text-foreground">
                {medicalRecords.length > 0 ? medicalRecords[0].record_date : 'N/A'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Current Prescriptions</h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={downloadingReport}
            onClick={handleDownloadInteractionReport}
          >
            <Download className="h-4 w-4 mr-2" />
            {downloadingReport ? 'Downloading...' : 'Download Safety Report'}
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2">
          <span className="text-xs text-amber-800">
            Medication Safety Report summarizes interaction risks for your active prescriptions.
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={downloadingReport}
            onClick={handleDownloadInteractionReport}
          >
            <Download className="h-4 w-4 mr-2" />
            {downloadingReport ? 'Downloading...' : 'Get PDF'}
          </Button>
        </div>
        {reportError && (
          <p className="text-xs text-amber-700 mb-3">{reportError}</p>
        )}

        {activePrescriptions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Pill className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No active prescriptions</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Medication</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Dosage</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Frequency</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Duration</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Refill</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Adherence</th>
                </tr>
              </thead>
              <tbody>
                {activePrescriptions.map((rx) => (
                  <tr key={rx.id} className="border-b border-border hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium text-foreground">{rx.medication_name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{rx.dosage}</td>
                    <td className="py-3 px-4 text-muted-foreground">{rx.frequency}</td>
                    <td className="py-3 px-4 text-muted-foreground">{rx.duration}</td>
                    <td className="py-3 px-4">
                      {rx.is_refill_needed ? (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                          Refill Needed
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{rx.end_date || 'N/A'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${rx.status === 'active' || rx.status === 'signed'
                        ? 'bg-green-100 text-green-700'
                        : rx.status === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                        }`}>
                        {rx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={adherenceLoading === rx.id}
                        onClick={() => handleMarkTaken(rx.id)}
                      >
                        {adherenceLoading === rx.id ? 'Logging...' : 'Mark Taken'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pastPrescriptions.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Pill className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-bold text-foreground">Past Medications</h3>
          </div>
          <div className="space-y-2">
            {pastPrescriptions.map((rx) => (
              <div key={rx.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                <div>
                  <p className="font-medium text-foreground">{rx.medication_name}</p>
                  <p className="text-xs text-muted-foreground">{rx.dosage} · {rx.frequency} · {rx.duration}</p>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700">Cancelled</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Medical History</h3>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search records, diagnoses, doctors..."
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
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRecords.map((record) => (
              <div key={record.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
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
                          onClick={() => window.open(record.file, '_blank')}
                          className="flex-shrink-0"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {record.record_date}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {record.doctor_name || 'Unknown'}
                      </span>
                    </div>

                    {record.prescriptions && record.prescriptions.length > 0 && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-md">
                        <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                          <Pill className="h-3 w-3" /> Prescriptions
                        </p>
                        <div className="space-y-1">
                          {record.prescriptions.map((rx: any) => (
                            <div key={rx.id} className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{rx.medication_name}</span>
                              {' '}- {rx.dosage}, {rx.frequency}
                              {rx.duration && <span> ({rx.duration})</span>}
                              {rx.is_signed && <span className="ml-2 text-green-600">Signed</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {record.notes && (
                      <div className="mt-3 text-sm text-muted-foreground italic">
                        {record.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="pt-4 text-center">
                <Button variant="ghost" onClick={loadMore} className="text-muted-foreground hover:text-primary">
                  Load More Records...
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
