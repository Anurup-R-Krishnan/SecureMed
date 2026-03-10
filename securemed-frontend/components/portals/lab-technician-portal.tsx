'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    FlaskConical,
    LayoutDashboard,
    FileText,
    History,
    LogOut,
    ChevronRight,
    Search,
    Filter,
    ArrowUpRight,
    Menu,
    X,
    Settings,
    RefreshCw,
    ClipboardList,
} from 'lucide-react';
import LabTechnicianWorklist from './lab/technician-worklist';
import { NotificationCenter } from '@/components/ui/notification-center';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type LabTab = 'worklist' | 'completed' | 'reports' | 'settings';

interface LabTechnicianPortalProps {
    onLogout: () => void;
    onSwitchRole: (role: 'patient' | 'doctor' | 'admin' | 'lab_technician' | null) => void;
    currentTab?: LabTab;
    onTabChange?: (tab: LabTab) => void;
}

export default function LabTechnicianPortal({ onLogout, onSwitchRole, currentTab, onTabChange }: LabTechnicianPortalProps) {
    const [activeTab, setActiveTabState] = useState<LabTab>(currentTab || 'worklist');
    const router = useRouter();

    // Sync tab with URL when currentTab prop changes
    useEffect(() => {
        if (currentTab && currentTab !== activeTab) {
            setActiveTabState(currentTab);
        }
    }, [currentTab, activeTab]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-card p-6 rounded-[24px] border border-border/60 shadow-sm transition-all hover:shadow-md mb-8">
                <div className="flex items-center gap-5">
                    <div className="bg-primary/10 p-4 rounded-2xl ring-1 ring-primary/20">
                        <FlaskConical className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight capitalize text-foreground">{activeTab}</h2>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                            Laboratory Management System
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 mt-4 md:mt-0">
                    <NotificationCenter />
                </div>
            </div>

            {activeTab === 'worklist' && <LabTechnicianWorklist />}

            {activeTab === 'completed' && (
                <div className="space-y-6">
                    <CompletedTestsView />
                </div>
            )}

            {activeTab === 'reports' && (
                <div className="space-y-6">
                    <ReportsView />
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-foreground">Lab Settings</h3>
                    <p className="text-muted-foreground">Manage laboratory configuration and preferences.</p>
                    <div className="bg-card p-8 rounded-lg border border-border text-center">
                        <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <Button variant="outline" onClick={() => router.push('/settings/security')}>Open Advanced Settings</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function CompletedTestsView() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await api.get('/labs/results/');
                setData(response.data);
            } catch (error) {
                console.error('Error fetching lab history:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'sample_id',
            header: 'Sample ID',
            cell: ({ row }) => <span className="font-mono font-bold">{row.getValue('sample_id')}</span>,
        },
        {
            accessorKey: 'test_name',
            header: 'Test Name',
        },
        {
            accessorKey: 'result_value',
            header: 'Result',
            cell: ({ row }) => <span className="font-semibold">{row.getValue('result_value')} {row.original.units}</span>,
        },
        {
            accessorKey: 'flag',
            header: 'Flag',
            cell: ({ row }) => {
                const flag = row.getValue('flag') as string;
                if (!flag) return <Badge variant="secondary">Normal</Badge>;
                return <Badge variant={flag === 'Critical' ? 'destructive' : 'outline'} className={flag === 'High' || flag === 'Low' ? 'text-amber-600 border-amber-200 bg-amber-50' : ''}>{flag}</Badge>;
            },
        },
        {
            accessorKey: 'completed_at',
            header: 'Completed At',
            cell: ({ row }) => new Date(row.getValue('completed_at')).toLocaleString(),
        },
    ];

    if (loading) return <div className="h-40 flex items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground">Laboratory History</h3>
            <DataTable columns={columns} data={data} />
        </div>
    );
}

function ReportsView() {
    const router = useRouter();
    const { toast } = useToast();
    const [downloading, setDownloading] = useState(false);

    const handleDownloadMonthlyReport = async () => {
        try {
            setDownloading(true);
            const response = await api.get('/labs/results/');
            const rows = Array.isArray(response.data) ? response.data : response.data?.results || [];
            if (!rows.length) {
                toast({ title: 'No data', description: 'No lab results available for report.', variant: 'destructive' });
                return;
            }
            const header = ['Sample ID', 'Test Name', 'Result', 'Units', 'Flag', 'Completed At'];
            const lines = rows.map((row: any) => ([
                row.sample_id || '',
                row.test_name || '',
                row.result_value || '',
                row.units || '',
                row.flag || '',
                row.completed_at || '',
            ]));
            const csv = [header, ...lines]
                .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                .join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `lab_report_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            toast({ title: 'Report downloaded', description: 'Monthly report exported as CSV.' });
        } catch (error) {
            toast({ title: 'Download failed', description: 'Could not generate report.', variant: 'destructive' });
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="bg-card p-12 rounded-[32px] border border-border text-center">
            <FlaskConical className="h-16 w-16 text-primary/40 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-foreground mb-2">Lab Analytics & Reports</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
                Generate detailed productivity reports, critical values summary, and turnaround time analytics.
            </p>
            <div className="flex justify-center gap-4">
                <Button className="rounded-xl font-bold" onClick={handleDownloadMonthlyReport} disabled={downloading}>
                    {downloading ? 'Preparing...' : 'Download Monthly Report'}
                </Button>
                <Button variant="outline" className="rounded-xl font-bold" onClick={() => router.push('/lab/worklist')}>
                    View Real-time Dashboard
                </Button>
            </div>
        </div>
    );
}
