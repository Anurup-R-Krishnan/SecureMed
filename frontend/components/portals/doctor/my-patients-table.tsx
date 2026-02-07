'use client';

import {
  ChevronRight,
  User,
  Clock,
  Activity,
  Search,
  ArrowUpDown
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Patient {
  id: string;
  name: string;
  age: number;
  status: 'Admitted' | 'Outpatient' | 'Observation';
  lastVisit: string;
  condition: string;
  isReferred?: boolean;
}

interface MyPatientsTableProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

const statusConfig = {
  Admitted: {
    color: 'bg-red-500/10 text-red-600 border-red-200',
    dot: 'bg-red-500'
  },
  Outpatient: {
    color: 'bg-green-500/10 text-green-600 border-green-200',
    dot: 'bg-green-500'
  },
  Observation: {
    color: 'bg-amber-500/10 text-amber-600 border-amber-200',
    dot: 'bg-amber-500'
  },
};

export default function MyPatientsTable({ patients, onSelectPatient }: MyPatientsTableProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Assigned Patients</h1>
          <p className="text-muted-foreground mt-1 font-medium italic">
            Monitoring clinical status and historical outcomes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 font-bold text-xs border-primary/20 bg-primary/5 text-primary">
            {patients.length} Total Patients
          </Badge>
        </div>
      </div>

      <Card className="border-none shadow-2xl bg-card rounded-[32px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Patient Profile</th>
                <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Age</th>
                <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Clinical Status</th>
                <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Last Encouter</th>
                <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {patients.map((patient) => (
                <tr
                  key={patient.id}
                  onClick={() => onSelectPatient(patient)}
                  className="group hover:bg-primary/[0.02] transition-all cursor-pointer"
                >
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                        <User className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-foreground text-sm leading-tight">{patient.name}</p>
                          {patient.isReferred && (
                            <Badge variant="outline" className="h-5 px-1.5 py-0 text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 border-blue-200">
                              Referred
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-tighter mt-0.5">{patient.condition}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-sm font-bold text-foreground">{patient.age}y</span>
                  </td>
                  <td className="p-6">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${statusConfig[patient.status].color}`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${statusConfig[patient.status].dot} animate-pulse`} />
                      {patient.status}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs font-medium">{patient.lastVisit}</span>
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <button className="h-10 w-10 rounded-xl bg-transparent group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all shadow-none group-hover:shadow-lg group-hover:shadow-primary/20">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {patients.length === 0 && (
        <div className="p-20 text-center rounded-[32px] border-2 border-dashed border-border bg-muted/20">
          <Activity className="h-12 w-12 text-muted-foreground opacity-20 mx-auto mb-4" />
          <p className="text-muted-foreground font-bold italic">No patients currently assigned to your workflow.</p>
        </div>
      )}
    </div>
  );
}
