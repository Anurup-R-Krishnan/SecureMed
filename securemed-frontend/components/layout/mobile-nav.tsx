'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, FlaskConical, Settings, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
    const pathname = usePathname();

    const links = [
        { href: '/doctor/dashboard', icon: Home, label: 'Home' },
        { href: '/doctor/patients', icon: Users, label: 'Patients' },
        { href: '/doctor/labs', icon: FlaskConical, label: 'Labs' },
        { href: '/doctor/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
            <div className="bg-background/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-full px-6 py-3 flex justify-between items-center ring-1 ring-black/5 dark:ring-white/10">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                        <Link key={link.href} href={link.href}>
                            <div className={cn(
                                "flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300 relative",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}>
                                {isActive && (
                                    <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
                                )}
                                <Icon className={cn("h-6 w-6 transition-transform", isActive && "scale-110")} />
                                {isActive && (
                                    <span className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full" />
                                )}
                            </div>
                        </Link>
                    )
                })}
                <button className="flex flex-col items-center justify-center w-12 h-12 rounded-full text-muted-foreground">
                    <Menu className="h-6 w-6" />
                </button>
            </div>
        </div>
    );
}
