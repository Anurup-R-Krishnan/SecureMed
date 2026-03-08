'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    resetErrorBoundary = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-red-200 bg-red-50/50 p-8 text-center dark:border-red-900/50 dark:bg-red-900/10">
                    <div className="mb-4 rounded-full bg-red-100 p-3 dark:bg-red-900/20">
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-red-900 dark:text-red-200">
                        Something went wrong
                    </h3>
                    <p className="mb-6 max-w-sm text-sm text-red-700 dark:text-red-300">
                        {this.state.error?.message || "An unexpected error occurred while rendering this component."}
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => this.setState({ hasError: false })}
                        className="gap-2 border-red-200 hover:bg-red-100 hover:text-red-900 dark:border-red-800 dark:hover:bg-red-900/40 dark:hover:text-red-100"
                    >
                        Try again
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={this.resetErrorBoundary}
                        className="mt-2 text-xs text-red-600 hover:text-red-800 dark:text-red-400"
                    >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Reload Page
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
