'use client';

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
    <RegisterPage 
      onSuccess={handleSuccess} 
      onBackToLogin={handleBackToLogin} 
    />
  );
}
