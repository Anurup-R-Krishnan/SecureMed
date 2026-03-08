'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import Header from '@/components/layout/header';
import LandingPage from '@/components/landing-page';
import LoginModal from '@/components/auth/login-modal';
import { getPortalRouteForRole } from '@/lib/routes';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // If user is already authenticated, redirect to their portal
  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(getPortalRouteForRole(user.role));
    }
  }, [isAuthenticated, user, router]);

  const handleOpenLogin = (role?: 'patient' | 'doctor' | 'admin') => {
    router.push('/login');
  };

  // Show landing page (no user authenticated)
  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={handleOpenLogin} />
      <LandingPage onGetStarted={handleOpenLogin} />
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}
