"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, ShieldAlert } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Error Overlay */}
      <div className="absolute inset-0 bg-red-500/5 animate-pulse duration-1000" />

      <div className="relative z-10 max-w-md w-full p-8 bg-card border border-border/60 rounded-[32px] shadow-2xl flex flex-col items-center text-center">
        <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-6 ring-4 ring-red-50 dark:ring-red-900/10">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h2 className="text-2xl font-black text-foreground tracking-tight mb-2">
          Critical System Anomaly
        </h2>
        <p className="text-sm font-mono text-red-500 mb-6 bg-red-50 dark:bg-red-950/30 px-3 py-1 rounded">
          Error Code: {error.digest || "UNKNOWN_EXCEPTION"}
        </p>

        <p className="text-muted-foreground mb-8">
          An unexpected error has occurred within the secure environment.
          Diagnostics have been logged. Please attempt a system reset.
        </p>

        <div className="flex gap-4 w-full">
          <Button
            onClick={reset}
            size="lg"
            className="w-full font-bold shadow-lg shadow-red-500/20 hover:shadow-red-500/40 bg-red-600 hover:bg-red-700 text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reboot System
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t w-full text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            SecureMed Safe Mode Active
          </p>
        </div>
      </div>
    </div>
  );
}
