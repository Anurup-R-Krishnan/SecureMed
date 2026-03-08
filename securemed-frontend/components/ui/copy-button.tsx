'use client';

import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CopyButtonProps extends React.ComponentProps<typeof Button> {
    value: string;
    label?: string;
}

export function CopyButton({ value, label, className, variant = "ghost", size = "icon", ...props }: CopyButtonProps) {
    const [hasCopied, setHasCopied] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        if (hasCopied) {
            const timeout = setTimeout(() => {
                setHasCopied(false);
            }, 2000);
            return () => clearTimeout(timeout);
        }
    }, [hasCopied]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setHasCopied(true);
            toast({
                description: "Copied to clipboard",
                duration: 2000,
            });
        } catch (err) {
            toast({
                title: "Failed to copy",
                description: "Please try again manually",
                variant: "destructive",
            });
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            className={cn("h-6 w-6", className)}
            onClick={handleCopy}
            {...props}
        >
            {hasCopied ? (
                <Check className="h-3 w-3 text-green-500" />
            ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
            )}
            {label && <span className="ml-2 sr-only">{label}</span>}
        </Button>
    );
}
