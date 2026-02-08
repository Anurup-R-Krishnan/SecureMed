'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-background flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-8">
                    <div className="flex justify-center">
                        <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="h-12 w-12 text-destructive" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-3xl font-black tracking-tight text-foreground">Critical Error</h1>
                        <p className="text-muted-foreground font-medium">
                            A critical error occurred in the application root. We need to reload the entire application.
                        </p>
                    </div>

                    <div className="flex justify-center">
                        <Button
                            size="lg"
                            onClick={() => reset()}
                            className="font-bold rounded-xl"
                        >
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            Reload Application
                        </Button>
                    </div>
                </div>
            </body>
        </html>
    )
}
