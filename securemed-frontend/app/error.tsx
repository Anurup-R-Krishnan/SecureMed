'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Unhandled app error:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center animate-in zoom-in duration-500">
                        <AlertCircle className="h-12 w-12 text-destructive" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Something went wrong!</h1>
                    <p className="text-muted-foreground">
                        We apologize for the inconvenience. An unexpected error has occurred.
                        Our team has been notified.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button onClick={() => reset()} size="lg" className="w-full sm:w-auto gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                    </Button>
                    <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2" onClick={() => window.location.href = '/'}>
                        <Home className="h-4 w-4" />
                        Go Home
                    </Button>
                </div>

                {error.digest && (
                    <p className="text-xs text-muted-foreground pt-4">
                        Error ID: <span className="font-mono bg-muted px-1 py-0.5 rounded">{error.digest}</span>
                    </p>
                )}
            </div>
        </div>
    );
}
