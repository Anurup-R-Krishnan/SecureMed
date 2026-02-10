'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Heart,
    Calendar,
    FileText,
    User,
    BarChart3,
    MessageSquare,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { NotificationCenter } from '@/components/ui/notification-center';

const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <Heart className="h-5 w-5" />, href: '/patient/dashboard' },
    { id: 'appointments', label: 'Appointments', icon: <Calendar className="h-5 w-5" />, href: '/patient/appointments' },
    { id: 'records', label: 'Medical Records', icon: <FileText className="h-5 w-5" />, href: '/patient/records' },
    { id: 'referrals', label: 'Referrals', icon: <User className="h-5 w-5" />, href: '/patient/referrals' },
    { id: 'billing', label: 'Billing', icon: <BarChart3 className="h-5 w-5" />, href: '/patient/billing' },
    { id: 'messaging', label: 'Messages', icon: <MessageSquare className="h-5 w-5" />, href: '/patient/messaging' },
    { id: 'profile', label: 'Profile', icon: <User className="h-5 w-5" />, href: '/patient/profile' },
    { id: 'settings', label: 'Privacy & Security', icon: <Settings className="h-5 w-5" />, href: '/patient/settings' },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { user, logout, isLoading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    const activeTab = tabs.find(t => pathname.includes(t.href)) || tabs[0];

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
                className={`fixed inset-y-0 left-0 z-30 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out md:translate-x-0 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${sidebarCollapsed ? 'w-20' : 'w-64'}
        `}
            >
                <div className="p-6 border-b border-sidebar-border flex items-center justify-between relative">
                    <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'justify-center w-full' : ''}`}>
                        <Heart className="h-6 w-6 text-sidebar-primary" />
                        {!sidebarCollapsed && (
                            <div>
                                <h1 className="text-xl font-bold text-sidebar-primary">SecureMed</h1>
                                <p className="text-xs text-sidebar-foreground/70">Patient Portal</p>
                            </div>
                        )}
                    </div>
                    {/* Desktop Collapse Toggle */}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="hidden md:flex absolute -right-3 top-8 bg-card border border-border rounded-full p-1 shadow-md hover:bg-muted transition-colors z-50"
                    >
                        {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                    </button>
                </div>

                {/* Patient Info */}
                <div className={`px-6 py-4 border-b border-sidebar-border ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
                    {isLoading ? (
                        sidebarCollapsed ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                            <div className="flex items-center gap-2 text-sidebar-foreground/70">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-xs">Loading...</span>
                            </div>
                        )
                    ) : user ? (
                        sidebarCollapsed ? (
                            <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-bold">
                                {(user.first_name || user.username).charAt(0).toUpperCase()}
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-sidebar-foreground/70">Logged in as</p>
                                <p className="font-semibold text-sidebar-primary truncate">
                                    {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username}
                                </p>
                                {user.patient_profile?.patient_id && (
                                    <p className="text-xs text-sidebar-foreground/60 truncate">ID: {user.patient_profile.patient_id}</p>
                                )}
                            </>
                        )
                    ) : null}
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2">
                    {tabs.map((tab) => {
                        const isActive = pathname.includes(tab.href);
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                onClick={() => {
                                    if (window.innerWidth < 768) setSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                                    } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                                title={sidebarCollapsed ? tab.label : undefined}
                            >
                                {tab.icon}
                                {!sidebarCollapsed && <span className="font-medium truncate min-w-0">{tab.label}</span>}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 font-medium transition-colors ${sidebarCollapsed ? 'px-2' : ''}`}
                        title={sidebarCollapsed ? 'Logout' : undefined}
                    >
                        <LogOut className="h-4 w-4" />
                        {!sidebarCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main
                className={`transition-all duration-300 ease-in-out min-h-screen
        ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}
        `}
            >
                {/* Top Bar */}
                <div className="bg-card border-b border-border p-6 sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <div className="min-w-0 flex-1 mr-4">
                            <h2 className="text-2xl font-bold text-foreground truncate">
                                {activeTab.label}
                            </h2>
                            <p className="text-muted-foreground mt-1 text-sm truncate">
                                Manage your health and appointments
                            </p>
                        </div>
                        <NotificationCenter />
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
