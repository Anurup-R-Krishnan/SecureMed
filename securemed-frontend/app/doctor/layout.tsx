'use client';

import React, { useState } from 'react';
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
    ShieldAlert
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { NotificationCenter } from '@/components/ui/notification-center';
import EmergencyAccessModal from '@/components/portals/doctor/shared/emergency-access-modal';

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

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const { user, logout } = useAuth();
    const [emergencyMode, setEmergencyMode] = useState(false);
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const handleEmergencyGranted = () => {
        setEmergencyMode(true);
        window.setTimeout(() => setEmergencyMode(false), 30 * 60 * 1000);
        setShowEmergencyModal(false);
    };

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    const activeTab = tabs.find(t => pathname.includes(t.href)) || tabs[0];

    return (
        <div className={`min-h-screen bg-background text-foreground ${emergencyMode ? 'ring-4 ring-destructive ring-offset-4 ring-offset-background' : ''}`}>
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
                    }`}
            >
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
            <main className="md:ml-64 min-h-screen transition-all duration-300">
                {/* Top Bar */}
                <div className="bg-background/80 backdrop-blur-md border-b border-border p-6 sticky top-0 z-20">
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
                            <Button variant="outline" size="sm" className="hidden sm:flex border-destructive/30 hover:bg-destructive/10 text-destructive font-bold" onClick={() => setShowEmergencyModal(true)}>
                                <ShieldAlert className="h-4 w-4 mr-2" />
                                Break Glass
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
