'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface FadeInProps extends React.HTMLAttributes<HTMLDivElement> {
    delay?: number;
    duration?: number;
}

export function FadeIn({ className, delay = 0, duration = 300, style, ...props }: FadeInProps) {
    return (
        <div
            className={cn(
                "animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards",
                className
            )}
            style={{
                animationDelay: `${delay}ms`,
                animationDuration: `${duration}ms`,
                ...style,
            }}
            {...props}
        />
    );
}

export function FadeInStagger({
    children,
    className,
    staggerDelay = 50,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { staggerDelay?: number }) {
    return (
        <div className={className} {...props}>
            {React.Children.map(children, (child, index) => {
                if (!React.isValidElement(child)) return child;

                return (
                    <FadeIn delay={index * staggerDelay} className="w-full">
                        {child}
                    </FadeIn>
                );
            })}
        </div>
    );
}
