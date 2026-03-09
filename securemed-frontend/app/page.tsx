'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import Header from '@/components/layout/header';
import LandingPage from '@/components/landing-page';
import { getPortalRouteForRole } from '@/lib/routes';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  // If user is already authenticated, redirect to their portal
  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(getPortalRouteForRole(user.role));
    }
  }, [isAuthenticated, user, router]);

  const handleOpenLogin = () => {
    router.push('/login');
  };

  // Show landing page (no user authenticated)
  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={handleOpenLogin} />
      <LandingPage onGetStarted={handleOpenLogin} />
    </div>
  );
}
