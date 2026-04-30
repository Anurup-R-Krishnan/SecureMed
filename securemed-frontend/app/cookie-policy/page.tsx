"use client";

import Link from "next/link";
import { ArrowLeft, Cookie } from "lucide-react";

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Cookie className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-black text-foreground">
              Cookie Policy
            </h1>
          </div>
          <div className="prose prose-sm text-muted-foreground leading-7 space-y-4">
            <p>
              SecureMed uses cookies and similar technologies to provide,
              protect, and improve our services.
            </p>
            <h2 className="text-lg font-bold text-foreground">
              Essential Cookies
            </h2>
            <p>
              Required for authentication, session management, and security.
              These cannot be disabled.
            </p>
            <h2 className="text-lg font-bold text-foreground">
              Functional Cookies
            </h2>
            <p>
              Remember your preferences such as theme, language, and last-viewed
              portal tab.
            </p>
            <h2 className="text-lg font-bold text-foreground">
              Analytics Cookies
            </h2>
            <p>
              Help us understand how users interact with the platform so we can
              improve the experience. All analytics data is anonymized.
            </p>
            <h2 className="text-lg font-bold text-foreground">
              Managing Cookies
            </h2>
            <p>
              You can control cookies through your browser settings. Disabling
              essential cookies may affect functionality.
            </p>
            <p className="text-xs text-muted-foreground pt-4 border-t border-border">
              Last updated: March 2026
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
