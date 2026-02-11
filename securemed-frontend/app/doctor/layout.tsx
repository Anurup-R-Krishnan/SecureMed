'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Calendar,
    Users,
    FileText,
    BarChart3,
    LogOut,
    Menu,
    X,
    Clock,
    Settings,
    Brain,
    Pill,
    FlaskConical,
    MessageSquare,
    ShieldAlert,
    AlertTriangle,
    Timer,
    XCircle
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { NotificationCenter } from '@/components/ui/notification-center';
import EmergencyAccessModal from '@/components/portals/doctor/shared/emergency-access-modal';

const EMERGENCY_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-5 w-5" />, href: '/doctor/dashboard' },
    { id: 'appointments', label: 'Appointments', icon: <Calendar className="h-5 w-5" />, href: '/doctor/appointments' },
    { id: 'patients', label: 'My Patients', icon: <Users className="h-5 w-5" />, href: '/doctor/patients' },
    { id: 'prescriptions', label: 'Prescriptions', icon: <Pill className="h-5 w-5" />, href: '/doctor/prescriptions' },
    { id: 'labs', label: 'Lab Orders', icon: <FlaskConical className="h-5 w-5" />, href: '/doctor/labs' },
    { id: 'records', label: 'Medical Records', icon: <FileText className="h-5 w-5" />, href: '/doctor/records' },
    { id: 'messaging', label: 'Messages', icon: <MessageSquare className="h-5 w-5" />, href: '/doctor/messaging' },
    { id: 'ai-assistant', label: 'AI Assistant', icon: <Brain className="h-5 w-5" />, href: '/doctor/ai-assistant' },
    { id: 'availability', label: 'Availability', icon: <Clock className="h-5 w-5" />, href: '/doctor/availability' },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" />, href: '/doctor/settings' },
];

interface EmergencySession {
    patientId: string;
    reason: string;
    emergencyType: string;
    grantedAt: number;
    expiresAt: number;
}

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const { user, logout } = useAuth();
    const [emergencyMode, setEmergencyMode] = useState(false);
    const [emergencySession, setEmergencySession] = useState<EmergencySession | null>(null);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    // Countdown timer for emergency session
    useEffect(() => {
        if (!emergencyMode || !emergencySession) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = emergencySession.expiresAt - now;
            if (remaining <= 0) {
                setEmergencyMode(false);
                setEmergencySession(null);
                setTimeRemaining('');
                return;
            }
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            setTimeRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [emergencyMode, emergencySession]);

    const handleEmergencyGranted = useCallback((data: { patientId: string; reason: string; emergencyType: string }) => {
        const now = Date.now();
        const session: EmergencySession = {
            patientId: data.patientId,
            reason: data.reason,
            emergencyType: data.emergencyType,
            grantedAt: now,
            expiresAt: now + EMERGENCY_DURATION_MS,
        };
        setEmergencySession(session);
        setEmergencyMode(true);
        setShowEmergencyModal(false);
    }, []);

    const handleDeactivateEmergency = useCallback(() => {
        setEmergencyMode(false);
        setEmergencySession(null);
        setTimeRemaining('');
    }, []);

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    const activeTab = tabs.find(t => pathname.includes(t.href)) || tabs[0];

    const emergencyTypeLabels: Record<string, string> = {
        life_threatening: 'Life Threatening',
        urgent_care: 'Urgent Care',
        critical_lab: 'Critical Lab Result',
        other: 'Other Emergency',
    };

    return (
        <div className={`min-h-screen bg-background text-foreground`}>
            {/* ======= BREAK GLASS ACTIVE BANNER ======= */}
            {emergencyMode && emergencySession && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white shadow-2xl shadow-red-600/30">
                    <div className="relative overflow-hidden">
                        {/* Animated pulse background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-700 via-red-600 to-red-700 animate-pulse opacity-30" />
                        <div className="relative md:ml-64 px-6 py-3">
                            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                        <ShieldAlert className="h-5 w-5 animate-pulse" />
                                        <span className="font-black text-sm uppercase tracking-wider">Break Glass Active</span>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-4 text-sm">
                                        <span className="font-semibold">
                                            Patient: <span className="font-black">{emergencySession.patientId}</span>
                                        </span>
                                        <span className="text-red-200">|</span>
                                        <span className="font-medium text-red-100">
                                            {emergencyTypeLabels[emergencySession.emergencyType] || emergencySession.emergencyType}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-bold">
                                        <Timer className="h-4 w-4" />
                                        <span>{timeRemaining || '30:00'} remaining</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-yellow-500/20 backdrop-blur-sm px-2 py-1.5 rounded-full text-xs font-bold text-yellow-100">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        All actions audited
                                    </div>
                                    <button
                                        onClick={handleDeactivateEmergency}
                                        className="flex items-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-bold transition-colors"
                                    >
                                        <XCircle className="h-4 w-4" />
                                        Deactivate
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Menu Button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="fixed top-4 left-4 z-40 md:hidden p-2 bg-card border border-border rounded-lg shadow-sm"
            >
                {sidebarOpen ? (
                    <X className="h-6 w-6 text-foreground" />
                ) : (
                    <Menu className="h-6 w-6 text-foreground" />
                )}
            </button>

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-30 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } ${emergencyMode ? 'border-r-red-500/50' : ''}`}
            >
                {/* Emergency indicator in sidebar */}
                {emergencyMode && (
                    <div className="bg-red-600 text-white text-center py-2 text-xs font-black uppercase tracking-widest animate-pulse">
                        ⚠ Emergency Mode ⚠
                    </div>
                )}

                <div className="p-6 border-b border-sidebar-border">
                    <h1 className="text-2xl font-black text-primary tracking-tight">SecureMed</h1>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Doctor Console</p>
                </div>

                {/* Doctor Info */}
                <div className="px-6 py-6 border-b border-sidebar-border bg-sidebar-accent/5">
                    <p className="text-lg font-bold text-foreground">
                        {user?.first_name && user?.last_name ? `Dr. ${user.first_name} ${user.last_name}` : user?.email}
                    </p>
                    <p className="text-sm font-medium text-primary">
                        {user?.doctor_profile?.specialization_display || user?.doctor_profile?.specialization || 'Doctor'}
                    </p>
                    {user?.doctor_profile?.department_name && (
                        <p className="text-xs text-muted-foreground mt-0.5">{user.doctor_profile.department_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-1">
                    {tabs.map((tab) => {
                        const isActive = pathname.includes(tab.href);
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${isActive
                                    ? 'bg-primary/10 text-primary shadow-sm'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                            >
                                {tab.icon}
                                <span className="font-semibold">{tab.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border space-y-2 bg-sidebar">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive hover:text-destructive-foreground font-bold transition-all"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`md:ml-64 min-h-screen transition-all duration-300 ${emergencyMode ? 'pt-[52px]' : ''}`}>
                {/* Top Bar */}
                <div className={`bg-background/80 backdrop-blur-md border-b p-6 sticky z-20 ${emergencyMode ? 'top-[52px] border-red-500/30' : 'top-0 border-border'}`}>
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black text-foreground tracking-tight">
                                {activeTab.label}
                            </h2>
                            <p className="text-sm font-medium text-muted-foreground">
                                {user?.first_name && user?.last_name
                                    ? `Dr. ${user.first_name} ${user.last_name}`
                                    : 'Doctor'}
                                {user?.doctor_profile?.specialization_display
                                    ? ` · ${user.doctor_profile.specialization_display}`
                                    : ''}
                                {' · SecureMed Hospital'}
                            </p>
                        </div>
                        <div className="flex gap-4 items-center">
                            <NotificationCenter />
                            <Button
                                variant="outline"
                                size="sm"
                                className={`hidden sm:flex font-bold ${emergencyMode
                                        ? 'border-red-500 bg-red-500/10 text-red-600 animate-pulse'
                                        : 'border-destructive/30 hover:bg-destructive/10 text-destructive'
                                    }`}
                                onClick={() => setShowEmergencyModal(true)}
                            >
                                <ShieldAlert className="h-4 w-4 mr-2" />
                                {emergencyMode ? 'Break Glass Active' : 'Break Glass'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {children}
                    </div>
                </div>
            </main>

            {/* Global Emergency Modal */}
            {showEmergencyModal && (
                <EmergencyAccessModal
                    isOpen={true}
                    patientId=""
                    patientName="Enter Patient ID"
                    onClose={() => setShowEmergencyModal(false)}
                    onSubmit={handleEmergencyGranted}
                />
            )}
        </div>
    );
}
