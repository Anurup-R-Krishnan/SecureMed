'use client';

import { Suspense } from 'react';

import { useRouter } from 'next/navigation';
import RegisterPage from '@/components/auth/register-page';

export default function RegisterRoute() {
  const router = useRouter();

  const handleSuccess = (role: 'patient' | 'doctor') => {
    // After successful registration, user needs to login
    // Redirect to home page where they can login
    router.push('/');
  };

  const handleBackToLogin = () => {
    router.push('/');
  };

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <RegisterPage
        onSuccess={handleSuccess}
        onBackToLogin={handleBackToLogin}
      />
    </Suspense>
  );
}
