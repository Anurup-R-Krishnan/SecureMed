'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, FileText, Pill, Stethoscope } from 'lucide-react';

const medicalRecords = [
  {
    id: 1,
    type: 'Lab Report',
    title: 'Complete Blood Count',
    date: 'Jan 15, 2025',
    doctor: 'Dr. Amit Patel',
    file: 'CBC_Report_2025.pdf',
    status: 'Normal',
  },
  {
    id: 2,
    type: 'Prescription',
    title: 'Cardiac Medications',
    date: 'Jan 10, 2025',
    doctor: 'Dr. Amit Patel',
    file: 'Prescription_2025_01.pdf',
    status: 'Active',
  },
  {
    id: 3,
    type: 'Diagnosis',
    title: 'Hypertension Management',
    date: 'Dec 28, 2024',
    doctor: 'Dr. Sarah Johnson',
    file: 'Diagnosis_Dec2024.pdf',
    status: 'Ongoing',
  },
  {
    id: 4,
    type: 'Lab Report',
    title: 'Thyroid Function Test',
    date: 'Dec 20, 2024',
    doctor: 'Dr. Rajesh Kumar',
    file: 'TFT_Report_2024.pdf',
    status: 'Normal',
  },
];

const activePrescriptions = [
  { id: 1, medicine: 'Aspirin', dosage: '100mg', frequency: 'Once daily', duration: '30 days', endDate: 'Feb 15, 2025' },
  { id: 2, medicine: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', duration: 'Ongoing', endDate: 'N/A' },
  { id: 3, medicine: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at night', duration: 'Ongoing', endDate: 'N/A' },
];

export default function MedicalRecords() {
  return (
    <div className="space-y-6">
      {/* Active Prescriptions */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          Active Prescriptions
        </h3>

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
              {activePrescriptions.map((rx) => (
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
      </Card>

      {/* Medical Records */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Medical Records
        </h3>

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
                      <p className="font-semibold text-foreground">{record.title}</p>
                      <p className="text-xs text-muted-foreground">{record.type}</p>
                    </div>
                  </div>
                  <div className="ml-11 flex flex-col sm:flex-row sm:gap-4 text-sm text-muted-foreground">
                    <span>{record.date}</span>
                    <span>•</span>
                    <span>Dr. {record.doctor.split(' ')[1]}</span>
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
      </Card>

      {/* Health Summary */}
      <Card className="p-6 bg-primary/5 border-l-4 border-l-primary">
        <h3 className="text-lg font-semibold text-foreground mb-4">Health Summary</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-muted-foreground text-sm">Last Checkup</p>
            <p className="text-2xl font-bold text-foreground mt-1">Jan 15, 2025</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Active Medications</p>
            <p className="text-2xl font-bold text-foreground mt-1">{activePrescriptions.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Medical Records</p>
            <p className="text-2xl font-bold text-foreground mt-1">{medicalRecords.length}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
