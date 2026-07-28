"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
      <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute bottom-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md p-6">
        <div className="h-24 w-24 rounded-full bg-muted/30 border border-border flex items-center justify-center mb-8 relative">
          <AlertTriangle className="h-10 w-10 text-muted-foreground opacity-50" />
          <div className="absolute inset-0 rounded-full animate-ping bg-primary/5 opacity-75 duration-1000" />
        </div>

        <h1 className="text-7xl font-black tracking-tighter text-foreground mb-2">
          404
        </h1>
        <h2 className="text-xl font-bold text-muted-foreground uppercase tracking-widest mb-6">
          Signal Lost
        </h2>

        <p className="text-muted-foreground mb-10 leading-relaxed">
          The requested medical record or page could not be located in the
          secure database. It may have been archived or deleted.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <Link href="/" className="w-full">
            <Button
              size="lg"
              className="w-full gap-2 font-bold shadow-lg hover:shadow-primary/25"
            >
              <Home className="h-4 w-4" />
              Return to Command Center
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="w-full gap-2 font-bold"
            onClick={() => window.history.back()}
          >
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}
