'use client';

import { useState } from 'react';
import Header from '@/components/layout/header';
import LandingPage from '@/components/landing-page';
import LoginModal from '@/components/auth/login-modal';
import PatientPortal from '@/components/portals/patient-portal';
import DoctorPortal from '@/components/portals/doctor-portal';
import AdminPortal from '@/components/portals/admin-portal';

type UserRole = 'patient' | 'doctor' | 'admin' | null;

export default function Home() {
  const [currentUser, setCurrentUser] = useState<UserRole>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginRole, setLoginRole] = useState<'patient' | 'doctor' | 'admin'>('patient');

  const handleOpenLogin = (role?: 'patient' | 'doctor' | 'admin') => {
    if (role) setLoginRole(role);
    setShowLoginModal(true);
  };

  const handleLoginSubmit = () => {
    setCurrentUser(loginRole);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleSwitchRole = (role: UserRole) => {
    setCurrentUser(role);
  };

  // Show patient portal
  if (currentUser === 'patient') {
    return (
      <PatientPortal 
        onLogout={handleLogout} 
        onSwitchRole={handleSwitchRole}
      />
    );
  }

  // Show doctor portal
  if (currentUser === 'doctor') {
    return (
      <DoctorPortal 
        onLogout={handleLogout} 
        onSwitchRole={handleSwitchRole}
      />
    );
  }

  // Show admin portal
  if (currentUser === 'admin') {
    return (
      <AdminPortal 
        onLogout={handleLogout} 
        onSwitchRole={handleSwitchRole}
      />
    );
  }

  // Show landing page
  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={handleOpenLogin} />
      <LandingPage onGetStarted={handleOpenLogin} />
      <LoginModal
        isOpen={showLoginModal}
        role={loginRole}
        onClose={() => setShowLoginModal(false)}
        onSubmit={handleLoginSubmit}
        onChangeRole={setLoginRole}
      />
    </div>
  );
}
