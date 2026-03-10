'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Bell,
    Search,
    Menu,
    User,
    LogOut,
    Settings,
    ChevronDown,
    Command
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface TopNavigationProps {
    userType: 'doctor' | 'patient' | 'admin' | 'lab_technician' | 'pharmacist';
}

export function TopNavigation({ userType }: TopNavigationProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        router.replace('/');
    };

    // Define navigation items based on user type
    const doctorNav = [
        { name: 'Dashboard', href: '/doctor/dashboard' },
        { name: 'Patients', href: '/doctor/patients' },
        { name: 'Appointments', href: '/doctor/appointments' },
        { name: 'Emergency Queue', href: '/doctor/triage-inbox' },
        { name: 'Ward Map', href: '/doctor/ward-map' },
        { name: 'Pharmacology', href: '/doctor/medication-interaction' },
    ];

    const patientNav = [
        { name: 'Dashboard', href: '/patient/dashboard' },
        { name: 'My Health', href: '/patient/records' },
        { name: 'Interactions', href: '/patient/medication-interaction' },
        { name: 'Appointments', href: '/patient/appointments' },
        { name: 'Billing', href: '/patient/billing' },
    ];

    const adminNav = [
        { name: 'Dashboard', href: '/admin/dashboard' },
        { name: 'Analytics', href: '/admin/analytics' },
        { name: 'Hospitals', href: '/admin/hospitals' },
        { name: 'Staff', href: '/admin/staff' },
        { name: 'Patients', href: '/admin/patients' },
        { name: 'Billing', href: '/admin/billing' },
        { name: 'Infections', href: '/admin/infection-tracking' },
        { name: 'Audit Logs', href: '/admin/audit-logs' },
    ];

    const labNav = [
        { name: 'Worklist', href: '/lab/worklist' },
        { name: 'Completed', href: '/lab/completed' },
        { name: 'Reports', href: '/lab/reports' },
        { name: 'Settings', href: '/lab/settings' },
    ];

    const pharmacyNav = [
        { name: 'Dashboard', href: '/pharmacy/dashboard' },
        { name: 'Orders', href: '/pharmacy/orders' },
        { name: 'Inventory', href: '/pharmacy/inventory' },
    ];

    let navItems = doctorNav;
    if (userType === 'patient') navItems = patientNav;
    else if (userType === 'admin') navItems = adminNav;
    else if (userType === 'lab_technician') navItems = labNav;
    else if (userType === 'pharmacist') navItems = pharmacyNav;

    return (
        <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background shadow-sm">
            <div className="container flex h-20 items-center justify-between px-6 max-w-[1600px] mx-auto">

                {/* Logo & Context */}
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black shadow-lg shadow-primary/20 text-lg relative overflow-hidden group">
                            <span className="relative z-10">SM</span>
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-shimmer transition-transform" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black tracking-tight leading-none text-foreground">
                                SecureMed
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Clinical Suite
                            </span>
                        </div>
                    </Link>

                </div>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center mx-4 bg-muted/30 p-1.5 rounded-full border border-border/50">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "px-3.5 py-2 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)] scale-105 font-extrabold ring-1 ring-primary/50"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    {/* Command Palette Trigger */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="hidden md:flex items-center gap-3 text-muted-foreground bg-card border-border/60 hover:bg-muted/20 hover:text-foreground w-56 justify-between h-10 px-4 rounded-xl shadow-sm"
                        onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                    >
                        <span className="flex items-center gap-2">
                            <Search className="h-4 w-4" />
                            <span className="text-xs font-medium">Global Search...</span>
                        </span>
                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded bg-muted px-1.5 font-mono text-[10px] font-bold text-muted-foreground opacity-100 border">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground relative h-10 w-10 hover:bg-muted/30 rounded-full">
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 border-2 border-background ring-1 ring-red-500/20"></span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80">
                            <DropdownMenuLabel className="flex justify-between items-center">
                                Notifications
                                <span className="text-[10px] font-normal text-muted-foreground">Mark all as read</span>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <div className="max-h-80 overflow-y-auto">
                                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-default">
                                    <div className="flex justify-between w-full">
                                        <span className="font-bold text-sm">Appointment Confirmed</span>
                                        <span className="text-[10px] text-muted-foreground">2m ago</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Your visit with Dr. Smith is confirmed for tomorrow at 10:00 AM.</p>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-default">
                                    <div className="flex justify-between w-full">
                                        <span className="font-bold text-sm">New Lab Result</span>
                                        <span className="text-[10px] text-muted-foreground">1h ago</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Your Blood Test results from yesterday are now available for viewing.</p>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-default opacity-60">
                                    <div className="flex justify-between w-full">
                                        <span className="font-medium text-sm">Prescription Ready</span>
                                        <span className="text-[10px] text-muted-foreground">5h ago</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Your prescription for Metformin has been sent to Central Pharmacy.</p>
                                </DropdownMenuItem>
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="justify-center text-primary font-bold text-xs cursor-pointer">
                                View All Notifications
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* User Profile */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-2 pl-2 pr-3 rounded-full border border-border/40 hover:bg-muted/50 hidden sm:flex h-10">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold border border-primary/20">
                                    {user?.first_name?.[0] || 'U'}
                                </div>
                                <div className="flex flex-col items-start gap-0.5 text-left">
                                    <span className="text-sm font-bold leading-none">{user?.last_name || 'User'}</span>
                                    <span className={cn(
                                        "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full leading-none",
                                        userType === 'doctor' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                        userType === 'patient' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                                        userType === 'admin' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                        userType === 'lab_technician' && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                                        userType === 'pharmacist' && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                    )}>
                                        {userType.replace('_', ' ')}
                                    </span>
                                </div>
                                <ChevronDown className="h-3 w-3 text-muted-foreground ml-1" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => window.location.href = `/${userType}/profile`}>
                                <User className="mr-2 h-4 w-4" />
                                <span>Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.location.href = `/${userType}/settings`}>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Mobile Menu Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Mobile Menu */}
            {
                mobileMenuOpen && (
                    <div className="md:hidden border-t bg-background p-4 space-y-4 shadow-lg absolute w-full">
                        <nav className="flex flex-col gap-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                        "text-sm font-medium p-2 rounded-md hover:bg-muted",
                                        pathname === item.href ? "bg-muted font-bold" : ""
                                    )}
                                >
                                    {item.name}
                                </Link>
                            ))}
                            <Button
                                variant="outline"
                                className="justify-start gap-2"
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    handleLogout();
                                }}
                            >
                                <LogOut className="h-4 w-4" />
                                Logout
                            </Button>
                        </nav>
                    </div>
                )
            }
        </header >
    );
}
