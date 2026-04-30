"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsOfServicePage() {
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
              <FileText className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-black text-foreground">
              Terms of Service
            </h1>
          </div>
          <div className="prose prose-sm text-muted-foreground leading-7 space-y-4">
            <p>
              By using SecureMed Healthcare services, you agree to these terms.
              Please read them carefully.
            </p>
            <h2 className="text-lg font-bold text-foreground">Eligibility</h2>
            <p>
              You must be at least 18 years old (or accessing with parental
              consent) to create an account with SecureMed.
            </p>
            <h2 className="text-lg font-bold text-foreground">
              Account Responsibility
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your
              login credentials and for all activities under your account.
            </p>
            <h2 className="text-lg font-bold text-foreground">
              Medical Disclaimer
            </h2>
            <p>
              SecureMed is a healthcare management platform. Clinical decisions
              are made by licensed healthcare providers. The platform does not
              replace professional medical advice.
            </p>
            <h2 className="text-lg font-bold text-foreground">
              Limitation of Liability
            </h2>
            <p>
              SecureMed is provided &quot;as is.&quot; We are not liable for
              service interruptions, data transmission delays, or third-party
              integrations beyond our control.
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
