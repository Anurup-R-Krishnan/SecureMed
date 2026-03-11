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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { API_ORIGIN } from '@/lib/urls';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

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
    const [uploading, setUploading] = useState(false);
    const [selectedResult, setSelectedResult] = useState<any | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await api.get('/labs/results/');
                const payload = Array.isArray(response.data) ? response.data : (response.data?.results || []);
                setData(payload);
            } catch (error) {
                console.error('Error fetching lab history:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const refreshHistory = async () => {
        try {
            const response = await api.get('/labs/results/');
            const payload = Array.isArray(response.data) ? response.data : (response.data?.results || []);
            setData(payload);
        } catch (error) {
            console.error('Error fetching lab history:', error);
        }
    };

    const handleOpenUpload = (row: any) => {
        setSelectedResult(row);
        setFile(null);
    };

    const handleUpload = async () => {
        if (!selectedResult || !file) return;
        setUploading(true);
        try {
            const payload = new FormData();
            payload.append('file_attachment', file);
            await api.patch(`/labs/results/${selectedResult.id}/`, payload);
            toast({ title: 'Attachment uploaded', description: 'Lab result attachment updated.' });
            setSelectedResult(null);
            setFile(null);
            await refreshHistory();
        } catch (error) {
            toast({ title: 'Upload failed', description: 'Could not upload attachment.', variant: 'destructive' });
        } finally {
            setUploading(false);
        }
    };

    const handleView = async (row: any) => {
        try {
            const res = await api.get(`/labs/results/${row.id}/presigned/`);
            const url = res.data?.url as string | undefined;
            if (!url) {
                toast({ title: 'No view link', description: 'Attachment not available.', variant: 'destructive' });
                return;
            }
            const viewUrl = url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
            window.open(viewUrl, '_blank', 'noopener,noreferrer');
        } catch (error) {
            toast({ title: 'View failed', description: 'Could not open attachment.', variant: 'destructive' });
        }
    };

    const handleDownload = async (row: any) => {
        try {
            const res = await api.get(`/labs/results/${row.id}/download/`, { responseType: 'blob' });
            const blob = new Blob([res.data]);
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = row.file_attachment_name || `lab_result_${row.id}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            toast({ title: 'Download failed', description: 'Could not download attachment.', variant: 'destructive' });
        }
    };

    const filteredData = data.filter((row: any) => {
        if (!searchQuery.trim()) return true;
        const term = searchQuery.trim().toLowerCase();
        return (
            String(row.sample_id || '').toLowerCase().includes(term) ||
            String(row.test_name || '').toLowerCase().includes(term) ||
            String(row.result_value || '').toLowerCase().includes(term)
        );
    });

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
            accessorKey: 'file_attachment_name',
            header: 'Attachment',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    {row.original.file_attachment_name ? (
                        <>
                            <Button size="sm" variant="outline" onClick={() => handleView(row.original)}>View</Button>
                            <Button size="sm" variant="outline" onClick={() => handleDownload(row.original)}>Download</Button>
                        </>
                    ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                    )}
                    <Button size="sm" onClick={() => handleOpenUpload(row.original)}>Upload</Button>
                </div>
            ),
        },
        {
            accessorKey: 'processed_at',
            header: 'Completed At',
            cell: ({ row }) => {
                const value = row.getValue('processed_at');
                return value ? new Date(value as string).toLocaleString() : '—';
            },
        },
    ];

    if (loading) return <div className="h-40 flex items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground">Laboratory History</h3>
                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search results..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-background"
                    />
                </div>
            </div>
            <DataTable columns={columns} data={filteredData} />
            <Dialog open={Boolean(selectedResult)} onOpenChange={(open) => !open && setSelectedResult(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Attachment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.dcm,.docx,.xlsx"
                            className="w-full text-sm"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                        {file && (
                            <p className="text-xs text-muted-foreground">Selected: {file.name}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedResult(null)}>Cancel</Button>
                        <Button onClick={handleUpload} disabled={!file || uploading}>
                            {uploading ? 'Uploading...' : 'Upload'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
                row.processed_at || '',
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
