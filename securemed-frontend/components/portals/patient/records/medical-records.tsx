'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, FileText, Pill, Stethoscope, FileJson } from 'lucide-react';
import { medicalRecordService } from '@/services/appointments';
import FHIRExportButton from '@/components/portals/patient/records/fhir-export-button';

import { UploadRecordDialog } from './upload-record-dialog';

export default function MedicalRecords() {
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleRecordUploaded = () => {
    fetchRecords();
  };

  return (
    <div className="space-y-6">
      {/* Upload Action */}
      <div className="flex justify-end">
        <UploadRecordDialog onRecordUploaded={handleRecordUploaded} />
      </div>

      {/* Active Prescriptions */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          Active Prescriptions
        </h3>

        {prescriptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No active prescriptions.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Medicine</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Dosage</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Frequency</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Duration/Status</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx) => (
                  <tr key={rx.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{rx.medication_name}</td>
                    <td className="py-3 px-4 text-foreground">{rx.dosage}</td>
                    <td className="py-3 px-4 text-muted-foreground">{rx.frequency}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${rx.status === 'active' || rx.status === 'signed' ? 'bg-blue-100 text-blue-700' :
                        rx.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                        {rx.duration} ({rx.status})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Medical Records */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Medical Records
        </h3>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading medical records...</div>
        ) : medicalRecords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No medical records found.</div>
        ) : (
          <div className="space-y-3">
            {medicalRecords.map((record) => (
              <div
                key={record.id}
                className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
                        <Stethoscope className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{record.record_type_display || 'Medical Record'}</p>
                        <p className="text-xs text-muted-foreground">{record.diagnosis}</p>
                      </div>
                    </div>
                    <div className="ml-11 flex flex-col sm:flex-row sm:gap-4 text-sm text-muted-foreground">
                      <span>{record.record_date}</span>
                      <span>•</span>
                      <span>{record.doctor_name || 'Dr. Unknown'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                      Available
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {record.file ? (
                      <Button variant="outline" size="sm" className="flex items-center gap-1 bg-transparent" onClick={() => window.open(record.file, '_blank')}>
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="flex items-center gap-1 bg-transparent" disabled>
                        <Eye className="h-4 w-4" />
                        No File
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Health Summary */}
      <Card className="p-6 bg-primary/5 border-l-4 border-l-primary">
        <h3 className="text-lg font-semibold text-foreground mb-4">Health Summary</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-muted-foreground text-sm">Last Checkup</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {medicalRecords.length > 0 ? medicalRecords[0].record_date : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Active Medications</p>
            <p className="text-2xl font-bold text-foreground mt-1">{prescriptions.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Medical Records</p>
            <p className="text-2xl font-bold text-foreground mt-1">{medicalRecords.length}</p>
          </div>
        </div>
      </Card>

      {/* FHIR Export Section */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <FileJson className="h-5 w-5 text-primary" />
          Export Medical History
        </h3>
        <p className="text-muted-foreground mb-4">
          Download your complete medical records in FHIR R4 format for portability or sharing with other healthcare providers.
        </p>
        <FHIRExportButton />
      </Card>
    </div>
  );
}
