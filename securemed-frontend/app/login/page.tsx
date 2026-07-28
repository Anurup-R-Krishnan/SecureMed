"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import LoginModal from "@/components/auth/login-modal";
import { getPortalRouteForRole } from "@/lib/routes";

function getSafeRedirect(redirectTo: string | null) {
  if (!redirectTo) return null;
  if (!redirectTo.startsWith("/")) return null;
  if (redirectTo.startsWith("//")) return null;
  return redirectTo;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const redirectTo = getSafeRedirect(searchParams.get("next"));
  const roleHint = searchParams.get("role");

  // Derive the effective redirect: explicit `next` wins, then role hint, then
  // the user's own portal.
  const effectiveRedirect =
    redirectTo ?? (roleHint ? getPortalRouteForRole(roleHint) : null);

  // If already authenticated, redirect to the appropriate portal
  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(effectiveRedirect || getPortalRouteForRole(user.role));
    }
  }, [isAuthenticated, effectiveRedirect, user, router]);

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">
          Redirecting to your dashboard...
        </p>
      </div>
    );
  }

  return (
    <LoginModal
      isOpen={true}
      onClose={() => {
        // Preserve context: go back if there's history, otherwise go home
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.assign("/");
        }
      }}
      redirectTo={effectiveRedirect}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <p className="text-muted-foreground">Loading login...</p>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
