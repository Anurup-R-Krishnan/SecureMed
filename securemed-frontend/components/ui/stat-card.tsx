import React from 'react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
    title: string;
    value: React.ReactNode;
    valueClassName?: string;
    icon?: React.ReactNode;
    description?: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export function StatCard({ title, value, valueClassName, icon, description, className, onClick }: StatCardProps) {
    return (
        <div 
            onClick={onClick}
            className={cn(
                "bg-card p-6 rounded-2xl border border-border shadow-sm transition-shadow",
                onClick && "cursor-pointer hover:shadow-md",
                className
            )}
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{title}</p>
                    <p className={cn("text-4xl font-black mt-2", valueClassName || "text-foreground")}>{value}</p>
                    {description && <div className="mt-2 text-sm">{description}</div>}
                </div>
                {icon && <div className="text-muted-foreground">{icon}</div>}
            </div>
        </div>
    );
}
