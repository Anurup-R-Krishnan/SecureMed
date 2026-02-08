'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import Header from '@/components/layout/header';
import LandingPage from '@/components/landing-page';
import LoginModal from '@/components/auth/login-modal';
import PatientPortal from '@/components/portals/patient-portal';
import DoctorPortal from '@/components/portals/doctor-portal';
import AdminPortal from '@/components/portals/admin-portal';
import LabTechnicianPortal from '@/components/portals/lab-technician-portal';

export default function Home() {
  const { user, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginRole, setLoginRole] = useState<'patient' | 'doctor' | 'admin'>('patient');

  const handleOpenLogin = (role?: 'patient' | 'doctor' | 'admin') => {
    if (role) setLoginRole(role);
    setShowLoginModal(true);
  };

  const handleLogout = () => {
    logout();
  };

  // Determine which portal to show based on authenticated user's role
  const userRole = user?.role;

  // Show patient portal
  if (userRole === 'patient') {
    return (
      <PatientPortal
        onLogout={handleLogout}
        onSwitchRole={() => { }}
      />
    );
  }

  // Show doctor/provider portal
  if (userRole === 'doctor' || userRole === 'provider') {
    return (
      <DoctorPortal
        onLogout={handleLogout}
        onSwitchRole={() => { }}
      />
    );
  }

  // Show admin portal
  if (userRole === 'admin') {
    return (
      <AdminPortal
        onLogout={handleLogout}
        onSwitchRole={() => { }}
      />
    );
  }

  // Show lab technician portal
  if (userRole === 'lab_technician') {
    return (
      <LabTechnicianPortal
        onLogout={handleLogout}
        onSwitchRole={() => { }}
      />
    );
  }

  // Show landing page (no user authenticated)
  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={handleOpenLogin} />
      <LandingPage onGetStarted={handleOpenLogin} />
      <LoginModal
        isOpen={showLoginModal}
        role={loginRole}
        onClose={() => setShowLoginModal(false)}
        onChangeRole={setLoginRole}
      />
    </div>
  );
}

