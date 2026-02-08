'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error)
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="flex justify-center">
                    <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="h-12 w-12 text-destructive" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Something went wrong</h1>
                    <p className="text-muted-foreground font-medium">
                        We encountered an unexpected error. Don&apos;t worry, your data is safe, but we need to restart the view.
                    </p>
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-4 p-4 bg-muted rounded-lg text-left overflow-auto max-h-40">
                            <p className="text-xs font-mono text-destructive">{error.message}</p>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                        size="lg"
                        onClick={() => reset()}
                        className="font-bold rounded-xl"
                    >
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Try Again
                    </Button>
                    <Button
                        variant="outline"
                        size="lg"
                        asChild
                        className="font-bold rounded-xl"
                    >
                        <Link href="/">
                            <Home className="h-4 w-4 mr-2" />
                            Go Home
                        </Link>
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground pt-4 border-t border-border">
                    If the problem persists, please contact support. Error ID: <span className="font-mono">{error.digest || 'N/A'}</span>
                </p>
            </div>
        </div>
    )
}
