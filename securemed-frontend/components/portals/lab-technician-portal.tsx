'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    FlaskConical,
    ClipboardList,
    FileText,
    LogOut,
    Menu,
    X,
    Settings,
    Bell,
} from 'lucide-react';
import LabTechnicianWorklist from './lab/technician-worklist';

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
                {activeTab === 'worklist' && <LabTechnicianWorklist />}

                {activeTab === 'completed' && (
                    <div className="p-8">
                        <h1 className="text-3xl font-bold text-foreground mb-6">Completed Tests</h1>
                        <div className="bg-card p-8 rounded-lg border border-border text-center">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <p className="text-foreground font-semibold mb-2">View Completed Results</p>
                            <p className="text-muted-foreground mb-6">
                                Browse and review previously processed test results
                            </p>
                            <Button>View History</Button>
                        </div>
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="p-8">
                        <h1 className="text-3xl font-bold text-foreground mb-6">Lab Reports</h1>
                        <div className="bg-card p-8 rounded-lg border border-border text-center">
                            <FlaskConical className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <p className="text-foreground font-semibold mb-2">Generate Reports</p>
                            <p className="text-muted-foreground mb-6">
                                Create quality control and productivity reports
                            </p>
                            <Button>Generate Report</Button>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="p-8">
                        <h1 className="text-3xl font-bold text-foreground mb-6">Settings</h1>
                        <div className="bg-card p-8 rounded-lg border border-border text-center">
                            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <p className="text-foreground font-semibold mb-2">Lab Settings</p>
                            <p className="text-muted-foreground mb-6">
                                Configure notification preferences and display options
                            </p>
                            <Button>Open Settings</Button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
