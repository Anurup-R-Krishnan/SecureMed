'use client';

import * as React from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function BackToTop() {
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    if (!isVisible) return null;

    return (
        <Button
            variant="outline"
            size="icon"
            className={cn(
                "fixed bottom-8 right-8 z-50 h-10 w-10 rounded-full shadow-lg border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all duration-300 animate-in fade-in zoom-in",
            )}
            onClick={scrollToTop}
            aria-label="Back to top"
        >
            <ArrowUp className="h-5 w-5" />
        </Button>
    );
}
