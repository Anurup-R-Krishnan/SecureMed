'use client';

import { useState, useEffect } from 'react';
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

type LabTab = 'worklist' | 'completed' | 'reports' | 'settings';

interface LabTechnicianPortalProps {
    onLogout: () => void;
    onSwitchRole: (role: 'patient' | 'doctor' | 'admin' | 'lab_technician' | null) => void;
}

export default function LabTechnicianPortal({ onLogout, onSwitchRole }: LabTechnicianPortalProps) {
    const [activeTab, setActiveTab] = useState<LabTab>('worklist');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const tabs: { id: LabTab; label: string; icon: React.ReactNode }[] = [
        { id: 'worklist', label: 'Worklist', icon: <ClipboardList className="h-5 w-5" /> },
        { id: 'completed', label: 'Completed', icon: <FileText className="h-5 w-5" /> },
        { id: 'reports', label: 'Reports', icon: <FlaskConical className="h-5 w-5" /> },
        { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile Menu Button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="fixed top-4 left-4 z-40 md:hidden p-2 bg-card border border-border rounded-lg"
            >
                {sidebarOpen ? (
                    <X className="h-6 w-6 text-foreground" />
                ) : (
                    <Menu className="h-6 w-6 text-foreground" />
                )}
            </button>

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-30 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="p-6 border-b border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <FlaskConical className="h-8 w-8 text-primary" />
                        <div>
                            <h1 className="text-xl font-bold text-sidebar-primary">Lab Portal</h1>
                            <p className="text-xs text-sidebar-foreground/70">SecureMed Laboratory</p>
                        </div>
                    </div>
                </div>

                {/* User Info */}
                <div className="px-6 py-4 border-b border-sidebar-border">
                    <p className="text-sm text-sidebar-foreground/70">Lab Technician</p>
                    <p className="font-semibold text-sidebar-primary">Lab Technician</p>
                    <p className="text-xs text-sidebar-foreground/60">Blinded Processing Mode</p>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent/10'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {/* Footer Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border space-y-2">
                    <button
                        onClick={() => onSwitchRole(null)}
                        className="w-full px-4 py-2 rounded-lg border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/10 text-sm font-medium transition-colors"
                    >
                        Back to Home
                    </button>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 font-medium transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="md:ml-64 min-h-screen">
                {/* Top Bar */}
                <div className="bg-card border-b border-border p-6 sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">
                                {tabs.find((t) => t.id === activeTab)?.label}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">Laboratory Management System</p>
                        </div>
                        <NotificationCenter />
                    </div>
                </div>

                <div className="p-6">
                    <div className="max-w-7xl mx-auto">
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
                                    <Button variant="outline">Open Advanced Settings</Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
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
    return (
        <div className="bg-card p-12 rounded-[32px] border border-border text-center">
            <FlaskConical className="h-16 w-16 text-primary/40 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-foreground mb-2">Lab Analytics & Reports</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
                Generate detailed productivity reports, critical values summary, and turnaround time analytics.
            </p>
            <div className="flex justify-center gap-4">
                <Button className="rounded-xl font-bold">Download Monthly Report</Button>
                <Button variant="outline" className="rounded-xl font-bold">View Real-time Dashboard</Button>
            </div>
        </div>
    );
}
