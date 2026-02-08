import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, FileText, Pill, Stethoscope, Loader2 } from 'lucide-react';
import { getPatientTimeline } from '@/lib/services/clinical-service';

interface MedicalRecordsProps {
  patientId?: string;
}

export default function MedicalRecords({ patientId = '1' }: MedicalRecordsProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const timeline = await getPatientTimeline(patientId);

        // Map timeline events to what we need
        const mappedRecords = timeline
          .filter((e: any) => e.type !== 'MEDICATION')
          .map((e: any) => ({
            id: e.id,
            type: e.type,
            title: e.title,
            date: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            doctor: e.provider,
            status: 'Normal',
            file: '#'
          }));

        const mappedPrescriptions = timeline
          .filter((e: any) => e.type === 'MEDICATION')
          .map((e: any) => ({
            id: e.id,
            medicine: e.title,
            dosage: e.details?.dosage || 'As prescribed',
            frequency: e.details?.frequency || 'Regular',
            endDate: e.details?.endDate || 'Ongoing'
          }));

        setRecords(mappedRecords);
        setPrescriptions(mappedPrescriptions);
      } catch (error) {
        console.error('Failed to load medical records', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground text-lg">Loading medical records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Prescriptions */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          Active Prescriptions
        </h3>

        {prescriptions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Medicine</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Dosage</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Frequency</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">End Date</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx) => (
                  <tr key={rx.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{rx.medicine}</td>
                    <td className="py-3 px-4 text-foreground">{rx.dosage}</td>
                    <td className="py-3 px-4 text-muted-foreground">{rx.frequency}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        {rx.endDate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No active prescriptions found.
          </div>
        )}
      </Card>

      {/* Medical Records */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Medical Records
        </h3>

        {records.length > 0 ? (
          <div className="space-y-3">
            {records.map((record) => (
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
                        <p className="font-semibold text-foreground">{record.title}</p>
                        <p className="text-xs text-muted-foreground">{record.type}</p>
                      </div>
                    </div>
                    <div className="ml-11 flex flex-col sm:flex-row sm:gap-4 text-sm text-muted-foreground">
                      <span>{record.date}</span>
                      <span>•</span>
                      <span>{record.doctor}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                      {record.status}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-1 bg-transparent">
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-1 bg-transparent">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No medical records found.
          </div>
        )}
      </Card>

      {/* Health Summary */}
      <Card className="p-6 bg-primary/5 border-l-4 border-l-primary">
        <h3 className="text-lg font-semibold text-foreground mb-4">Health Summary</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-muted-foreground text-sm">Active Medications</p>
            <p className="text-2xl font-bold text-foreground mt-1">{prescriptions.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Total Records</p>
            <p className="text-2xl font-bold text-foreground mt-1">{records.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Last Update</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {records.length > 0 ? records[0].date : 'N/A'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
