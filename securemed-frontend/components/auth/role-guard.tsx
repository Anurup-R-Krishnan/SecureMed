"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { getPortalRouteForRole, ROUTES } from "@/lib/routes";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      if (typeof window !== "undefined") {
        const postLogout = window.localStorage.getItem("post_logout_redirect");
        if (postLogout) {
          window.localStorage.removeItem("post_logout_redirect");
          router.replace(postLogout);
          return;
        }
      }
      const next = encodeURIComponent(pathname);
      router.replace(`${ROUTES.LOGIN}?next=${next}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) return;
    if (!allowedRoles.includes(user.role)) {
      const target = getPortalRouteForRole(user.role);
      if (pathname && !pathname.startsWith(target)) {
        const currentPath = pathname;
        router.replace(target);
        // Fallback for environments where client navigation is delayed.
        window.setTimeout(() => {
          if (window.location.pathname === currentPath) {
            window.location.assign(target);
          }
        }, 500);
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router, pathname]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  if (user && !allowedRoles.includes(user.role)) {
    const target = getPortalRouteForRole(user.role);
    if (pathname && !pathname.startsWith(target)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-muted-foreground">Redirecting...</div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Access Denied
            </h1>
            <p className="text-muted-foreground">
              You do not have permission to view this page. Current role:{" "}
              <span className="font-mono font-bold">{user.role}</span>
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => router.push(getPortalRouteForRole(user.role))}
          >
            Go to My Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
