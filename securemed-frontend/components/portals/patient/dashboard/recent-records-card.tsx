'use client';

import { Card } from '@/components/ui/card';
import { FileText, Calendar, User, Activity, Pill, Microscope, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MedicalRecord {
    id: number;
    record_type: string;
    diagnosis: string;
    doctor_name: string;
    date: string | null;
    notes: string;
}

interface RecentRecordsCardProps {
    records: MedicalRecord[];
    onNavigate: (tab: any) => void;
}

export default function RecentRecordsCard({ records, onNavigate }: RecentRecordsCardProps) {
    const getRecordIcon = (type: string) => {
        const normalizedType = type.toLowerCase();
        if (normalizedType.includes('consultation')) return Stethoscope;
        if (normalizedType.includes('lab')) return Microscope;
        if (normalizedType.includes('prescription')) return Pill;
        if (normalizedType.includes('imaging')) return Activity;
        return FileText;
    };

    const getRecordColor = (type: string) => {
        const normalizedType = type.toLowerCase();
        if (normalizedType.includes('consultation')) return 'text-blue-500 bg-blue-500/10';
        if (normalizedType.includes('lab')) return 'text-purple-500 bg-purple-500/10';
        if (normalizedType.includes('prescription')) return 'text-emerald-500 bg-emerald-500/10';
        if (normalizedType.includes('imaging')) return 'text-amber-500 bg-amber-500/10';
        return 'text-slate-500 bg-slate-500/10';
    };

    if (!records || records.length === 0) {
        return (
            <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        Recent Medical Records
                    </h3>
                </div>
                <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No medical records available</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    Recent Medical Records
                </h3>
                <Button
                    variant="link"
                    className="text-primary text-sm h-auto p-0"
                    onClick={() => onNavigate('records')}
                >
                    View all
                </Button>
            </div>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/20 via-primary/10 to-transparent" />

                <div className="space-y-4">
                    {records.map((record, index) => {
                        const Icon = getRecordIcon(record.record_type);
                        const colorClass = getRecordColor(record.record_type);

                        return (
                            <div key={record.id} className="relative pl-12">
                                {/* Timeline node */}
                                <div className={`absolute left-[18px] top-3 h-3 w-3 rounded-full border-2 border-background ${colorClass.split(' ')[1]} z-10`} />

                                <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-blue-500/20 transition-all group">
                                    <div className="flex items-start gap-3">
                                        <div className={`h-10 w-10 shrink-0 rounded-lg ${colorClass} flex items-center justify-center`}>
                                            <Icon className="h-5 w-5" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <div>
                                                    <Badge variant="secondary" className="text-[10px] font-bold uppercase mb-1">
                                                        {record.record_type}
                                                    </Badge>
                                                    <h4 className="font-semibold text-foreground group-hover:text-blue-400 transition-colors">
                                                        {record.diagnosis || 'General Consultation'}
                                                    </h4>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                                                {record.doctor_name && (
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        {record.doctor_name}
                                                    </span>
                                                )}
                                                {record.date && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(record.date).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </span>
                                                )}
                                            </div>

                                            {record.notes && (
                                                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                                    {record.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
}
