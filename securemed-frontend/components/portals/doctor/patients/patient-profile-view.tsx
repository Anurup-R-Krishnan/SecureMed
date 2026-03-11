'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Download, Pill, ShieldAlert, CheckCircle2, TrendingUp, Clock, RefreshCw, Microscope, Eye, FileText, FlaskConical } from 'lucide-react';
import PatientTimeline from './patient-timeline';
import PatientNotes from './patient-notes';
import PatientAnatomyCard from './patient-anatomy-card';
import EmergencyAccessModal from '@/components/portals/doctor/shared/emergency-access-modal';
import { PatientInfoCard } from '@/components/ui/patient-info-card';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { drugInteractionService, type InteractionReport } from '@/services/drug-interactions';
import { API_ORIGIN } from '@/lib/urls';

interface Patient {
  id: string;
  name: string;
  age: number;
  status: 'Admitted' | 'Outpatient' | 'Observation';
  lastVisit: string;
  condition: string;
  gender?: string;
  dateOfBirth?: string;
  bloodType?: string;
  allergies?: string[];
  medicalHistory?: string[];
}

interface PatientProfileViewProps {
  patient: Patient;
  onBack: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  signed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  dispensed: 'bg-blue-100 text-blue-700 border-blue-200',
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  draft: 'bg-amber-100 text-amber-700 border-amber-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

export default function PatientProfileView({ patient, onBack }: PatientProfileViewProps) {
  const router = useRouter();
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [interactionReport, setInteractionReport] = useState<InteractionReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [labResults, setLabResults] = useState<any[]>([]);
  const [labLoading, setLabLoading] = useState(false);
  const [labError, setLabError] = useState<string | null>(null);

  const handleDownloadReport = async () => {
    setDownloadingPDF(true);
    setPdfError(null);
    try {
      const blob = await drugInteractionService.downloadReportPDFWithGeneration(parseInt(patient.id));
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `interaction_report_${patient.name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        setPdfError('Session expired. Please log in again.');
      } else if (error?.message?.includes('timed out')) {
        setPdfError('Report generation is taking longer than expected. Try again in a moment.');
      } else {
        setPdfError('No interaction report found for this patient.');
      }
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleRegenerateReport = async () => {
    setRegenerating(true);
    try {
      await drugInteractionService.regenerateReport(parseInt(patient.id));
      const report = await drugInteractionService.getLatestReport(parseInt(patient.id));
      setInteractionReport(report);
    } catch {
      // silently fail
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setReportLoading(true);
        setLabLoading(true);
        setLabError(null);
        const [rxRes, report, labRes] = await Promise.all([
          api.get(`/medical-records/prescriptions/`, { params: { patient_id: patient.id } }),
          drugInteractionService.getLatestReport(parseInt(patient.id)).catch(() => null),
          api.get('/labs/results/', { params: { patient_id: patient.id } }).catch(() => ({ data: [] })),
        ]);
        const data = Array.isArray(rxRes.data) ? rxRes.data : (rxRes.data.results || []);
        setPrescriptions(data);
        setInteractionReport(report);
        const labPayload = Array.isArray(labRes?.data) ? labRes.data : (labRes?.data?.results || []);
        setLabResults(labPayload);
      } catch (err) {
        console.error('Failed to fetch data', err);
        setLabError('Unable to load lab results.');
      } finally {
        setLoading(false);
        setReportLoading(false);
        setLabLoading(false);
      }
    }
    fetchData();
  }, [patient.id]);

  const activePrescriptions = prescriptions.filter(rx => ['signed', 'dispensed', 'active'].includes(rx.status));
  const riskLevel = interactionReport
    ? interactionReport.critical_count > 0 ? 'critical'
      : interactionReport.high_count > 0 ? 'high'
      : interactionReport.moderate_count > 0 ? 'moderate'
      : interactionReport.total_findings > 0 ? 'low'
      : 'safe'
    : null;

  return (
    <div className="space-y-6">
      {/* Header with Emergency Access */}
      <div className="bg-card p-8 rounded-[32px] border border-border shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Patients</span>
          </button>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/doctor/prescriptions?patient_id=${patient.id}`)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Write Prescription
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/doctor/labs?patient_id=${patient.id}`)}
            >
              <FlaskConical className="h-4 w-4 mr-2" />
              Order Labs
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/30 hover:bg-destructive/10 text-destructive font-bold"
              onClick={() => setShowEmergencyModal(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Break-Glass Access
            </Button>
          </div>
        </div>

        {/* Patient Info Card */}
        <PatientInfoCard patient={{
          id: patient.id,
          name: patient.name,
          age: patient.age,
          status: patient.status,
          lastVisit: patient.lastVisit,
          condition: patient.condition,
        }} />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Medications & Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          <PatientAnatomyCard />

          {/* Prescriptions card */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Current Medications</h2>
              {!loading && (
                <span className="ml-auto text-xs text-muted-foreground">{activePrescriptions.length} active</span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-5 w-5 rounded-full border-2 border-muted border-t-primary animate-spin" />
              </div>
            ) : activePrescriptions.length > 0 ? (
              <div className="divide-y divide-border">
                {activePrescriptions.map((rx) => {
                  const statusKey = rx.status?.toLowerCase() ?? 'draft';
                  const adherence = rx.adherence_count ?? null;
                  return (
                    <div key={rx.id} className="px-5 py-3.5 flex items-start gap-3">
                      <div className="mt-0.5 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Pill className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{rx.medication_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{rx.dosage} · {rx.frequency}</p>
                        <p className="text-xs text-muted-foreground">{rx.duration}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[statusKey] ?? 'bg-muted text-muted-foreground border-border'}`}>
                          {statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
                        </span>
                        {adherence !== null ? (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {adherence} taken
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/50">No adherence data</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">No active prescriptions.</div>
            )}
          </div>

          {/* Lab Results */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Microscope className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Lab Results</h2>
              {labLoading && (
                <span className="ml-auto text-xs text-muted-foreground">Loading…</span>
              )}
            </div>

            {labError && (
              <div className="px-5 py-3 text-xs text-destructive">{labError}</div>
            )}

            {labLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-5 w-5 rounded-full border-2 border-muted border-t-primary animate-spin" />
              </div>
            ) : labResults.length > 0 ? (
              <div className="divide-y divide-border">
                {labResults.slice(0, 6).map((result) => (
                  <div key={result.id} className="px-5 py-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{result.test_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {result.result_value} {result.units || ''} {result.reference_range ? `· Ref ${result.reference_range}` : ''}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {result.processed_at ? new Date(result.processed_at).toLocaleString() : 'Pending'}
                        </p>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                        result.flag === 'Critical'
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : result.flag === 'High' || result.flag === 'Low'
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}>
                        {result.flag || 'Normal'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const res = await api.get(`/labs/results/${result.id}/presigned/`);
                            const url = res.data?.url as string | undefined;
                            if (!url) return;
                            const viewUrl = url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
                            window.open(viewUrl, '_blank', 'noopener,noreferrer');
                          } catch {
                            setLabError('Unable to open lab attachment.');
                          }
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const res = await api.get(`/labs/results/${result.id}/download/`, { responseType: 'blob' });
                            const blob = new Blob([res.data]);
                            const link = document.createElement('a');
                            const url = URL.createObjectURL(blob);
                            link.href = url;
                            link.download = result.file_attachment_name || `lab_result_${result.id}`;
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                            URL.revokeObjectURL(url);
                          } catch {
                            setLabError('Unable to download lab attachment.');
                          }
                        }}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Download
                      </Button>
                      {!result.released_to_patient && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await api.post(`/labs/results/${result.id}/release/`);
                              setLabResults((prev) =>
                                prev.map((r) => (r.id === result.id ? { ...r, released_to_patient: true } : r))
                              );
                            } catch {
                              setLabError('Unable to release result to patient.');
                            }
                          }}
                        >
                          Release to Patient
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No lab results available for this patient.
              </div>
            )}
          </div>

          {/* Interaction Report Card */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Interaction Report</h2>
              <button
                type="button"
                onClick={handleRegenerateReport}
                disabled={regenerating}
                className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                title="Regenerate report"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {reportLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-5 w-5 rounded-full border-2 border-muted border-t-primary animate-spin" />
              </div>
            ) : interactionReport ? (
              <div className="p-5 space-y-4">
                {/* Risk banner */}
                {riskLevel === 'safe' ? (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-medium text-emerald-700">No significant interactions detected</span>
                  </div>
                ) : riskLevel === 'critical' ? (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                    <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
                    <span className="text-xs font-medium text-red-700">Critical interactions detected — review required</span>
                  </div>
                ) : riskLevel === 'high' ? (
                  <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2">
                    <ShieldAlert className="h-4 w-4 text-orange-600 shrink-0" />
                    <span className="text-xs font-medium text-orange-700">High severity interactions present</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                    <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-xs font-medium text-amber-700">Some interactions found — monitor patient</span>
                  </div>
                )}

                {/* Severity counts grid */}
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {[
                    { label: 'Critical', count: interactionReport.critical_count, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
                    { label: 'High', count: interactionReport.high_count, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
                    { label: 'Moderate', count: interactionReport.moderate_count, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
                    { label: 'Low', count: interactionReport.low_count, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
                  ].map(({ label, count, color, bg }) => (
                    <div key={label} className={`rounded-lg border p-2 ${bg}`}>
                      <p className={`text-base font-bold leading-none ${color}`}>{count}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-none">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Medications evaluated */}
                {Array.isArray(interactionReport.items) && interactionReport.items.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Medications evaluated</p>
                    <div className="flex flex-wrap gap-1">
                      {[...new Set(interactionReport.items.flatMap(i => i.medications))].map(med => (
                        <span key={med} className="text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border text-foreground">
                          {med}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer: date + download */}
                <div className="flex items-center justify-between pt-1">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(interactionReport.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadReport}
                    disabled={downloadingPDF}
                    className="h-7 text-xs px-2 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Download className="h-3 w-3" />
                    {downloadingPDF ? 'Downloading…' : 'Export PDF'}
                  </Button>
                </div>
                {pdfError && <p className="text-xs text-destructive">{pdfError}</p>}
              </div>
            ) : (
              <div className="py-10 text-center space-y-2">
                <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No interaction report yet.</p>
                <button
                  type="button"
                  onClick={handleRegenerateReport}
                  disabled={regenerating}
                  className="text-xs text-primary hover:underline"
                >
                  {regenerating ? 'Generating…' : 'Generate now'}
                </button>
              </div>
            )}
          </div>

          <PatientNotes patient={{
            id: patient.id,
            name: patient.name,
            age: patient.age,
            gender: patient.gender || 'Unknown',
            dateOfBirth: patient.dateOfBirth || 'Unknown',
            bloodType: patient.bloodType || 'Unknown',
            allergies: patient.allergies || [],
            medicalHistory: patient.medicalHistory || []
          }} />
        </div>

        {/* Right Column - Timeline */}
        <div className="lg:col-span-2">
          <PatientTimeline patientId={patient.id} />
        </div>
      </div>

      {/* Emergency Access Modal */}
      <EmergencyAccessModal
        isOpen={showEmergencyModal}
        patientId={patient.id}
        patientName={patient.name}
        onClose={() => setShowEmergencyModal(false)}
        onSubmit={() => setShowEmergencyModal(false)}
      />
    </div>
  );
}
